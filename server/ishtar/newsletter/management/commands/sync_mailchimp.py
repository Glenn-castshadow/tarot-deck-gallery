from django.core.management.base import BaseCommand, CommandError

from newsletter import mailchimp
from newsletter.models import Subscriber

LIVE = {'subscribed', 'pending'}
GONE = {'unsubscribed', 'cleaned'}


class Command(BaseCommand):
    help = 'Two-way reconcile of the subscriber table with the Mailchimp audience. Prints counts, never addresses.'

    def handle(self, **options):
        if not mailchimp.configured():
            self.stdout.write('Mailchimp not configured; nothing to do.')
            return
        # ponytail: full diff each run, fine to a few thousand members; switch to
        # since_last_changed when a run takes more than a few seconds.
        audience = dict(mailchimp.members())
        rows = {row.email: row for row in Subscriber.objects.all()}
        if audience and not rows:
            raise CommandError('no subscribers in the database but %d in the audience; '
                                'refusing to unsubscribe everyone' % len(audience))
        pushed = removed = failed = 0
        for email, row in rows.items():
            if email not in audience:
                try:
                    mailchimp.push(row)
                    pushed += 1
                except Exception:
                    failed += 1
        for email, status in audience.items():
            if status in LIVE and email not in rows:
                try:
                    mailchimp.remove(email)
                    removed += 1
                except Exception:
                    failed += 1
        left = [email for email, status in audience.items() if status in GONE and email in rows]
        Subscriber.objects.filter(email__in=left).delete()
        self.stdout.write(f'pushed={pushed} removed={removed} deleted={len(left)} failed={failed}')
        if failed:
            raise CommandError('%d Mailchimp calls failed' % failed)
