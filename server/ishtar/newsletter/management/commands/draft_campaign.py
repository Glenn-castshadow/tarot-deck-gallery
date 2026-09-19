import hashlib
import json
import re
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from newsletter import mailchimp

# A weekly issue is about 4.35 sends per subscriber per month, and the free plan allows 500 a month.
SENDS_PER_MEMBER_PER_MONTH = 52 / 12
FREE_PLAN_MONTHLY_SENDS = 500
WARN_FROM_MEMBERS = 100


class Command(BaseCommand):
    help = ('Create or update the DRAFT Mailchimp campaign for a week from the files pushed by '
            'tools/build_newsletter.cjs, run the send checklist, and optionally send one test. '
            'It never sends or schedules a campaign: the owner does that in Mailchimp.')

    def add_arguments(self, parser):
        parser.add_argument('week', help='The Monday the issue is for, YYYY-MM-DD.')
        parser.add_argument('--test', metavar='ADDRESS', help='Send one test email to this address.')
        parser.add_argument('--replace', action='store_true', help='Overwrite an existing draft for this week.')

    def handle(self, week, test=None, replace=False, **options):
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', week):
            raise CommandError('week must be YYYY-MM-DD')
        if not mailchimp.configured():
            self.stdout.write('Mailchimp not configured; nothing to do.')
            return
        folder = Path(settings.NEWSLETTER_ISSUE_DIR) / week
        try:
            manifest = json.loads((folder / 'issue.json').read_text(encoding='utf-8'))
            html = (folder / 'issue.html').read_text(encoding='utf-8')
        except OSError as error:
            raise CommandError(f'no pushed issue for {week}: {error}')
        if hashlib.sha256(html.encode('utf-8')).hexdigest() != manifest['html_sha256']:
            raise CommandError('issue.html does not match the sha256 in issue.json; push the issue again')

        campaign = self.existing(manifest['title'])
        if campaign and campaign['status'] != 'save':
            raise CommandError(f"a campaign titled {manifest['title']!r} is already {campaign['status']}; not touching it")
        if campaign and not replace:
            raise CommandError(f"a draft titled {manifest['title']!r} exists; pass --replace to overwrite it")
        details = {'subject_line': manifest['subject'], 'preview_text': manifest['preview'], 'title': manifest['title'],
                   'from_name': manifest['from_name'], 'reply_to': manifest['reply_to']}
        if campaign:
            mailchimp._request('PATCH', f"/campaigns/{campaign['id']}", {'settings': details})
        else:
            campaign = mailchimp._request('POST', '/campaigns', {
                'type': 'regular', 'recipients': {'list_id': settings.MAILCHIMP_AUDIENCE_ID}, 'settings': details})
        mailchimp._request('PUT', f"/campaigns/{campaign['id']}/content", {'html': html})
        self.stdout.write(f"draft ready: {manifest['title']} ({manifest['bytes']} bytes, "
                          f"{len(manifest['signs_included'])}/12 signs)")
        if manifest['signs_missing']:
            self.stdout.write('  readers of these signs get the missing-reading panel: ' + ', '.join(manifest['signs_missing']))

        checklist = mailchimp._request('GET', f"/campaigns/{campaign['id']}/send-checklist")
        for item in checklist.get('items', []):
            if item.get('type') != 'success':
                self.stdout.write(f"  {item.get('type', '?').upper()}: {item.get('heading', '')} {item.get('details', '')}".rstrip())
        self.stdout.write('Mailchimp checklist: ' + ('ready to send' if checklist.get('is_ready') else 'NOT ready to send'))

        members = mailchimp._request('GET', f'/lists/{settings.MAILCHIMP_AUDIENCE_ID}',
                                     params={'fields': 'stats.member_count'})['stats']['member_count']
        monthly = round(members * SENDS_PER_MEMBER_PER_MONTH)
        self.stdout.write(f'audience: {members} subscribed; a weekly issue is about {monthly} sends a month '
                          f'of the free plan\'s {FREE_PLAN_MONTHLY_SENDS}')
        if members >= WARN_FROM_MEMBERS:
            self.stdout.write('  WARNING: the free plan carries a weekly newsletter to about 115 subscribers')

        if test:
            mailchimp._request('POST', f"/campaigns/{campaign['id']}/actions/test",
                               {'test_emails': [test], 'send_type': 'html'})
            self.stdout.write('test sent. A test shows the no-sign version whatever the recipient\'s sign: '
                              'Mailchimp does not fill merge fields in a test.')
        self.stdout.write(f"review and send it yourself: https://{settings.MAILCHIMP_SERVER}.admin.mailchimp.com/"
                          f"campaigns/edit?id={campaign.get('web_id', '')}")

    def existing(self, title):
        found = mailchimp._request('GET', '/campaigns', params={
            'list_id': settings.MAILCHIMP_AUDIENCE_ID, 'count': 1000, 'sort_field': 'create_time', 'sort_dir': 'DESC',
            'fields': 'campaigns.id,campaigns.web_id,campaigns.status,campaigns.settings.title'})
        for campaign in found.get('campaigns', []):
            if campaign.get('settings', {}).get('title') == title:
                return campaign
        return None
