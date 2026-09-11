import csv

from django.core.management.base import BaseCommand

from newsletter.models import Subscriber


class Command(BaseCommand):
    help = 'Write subscribers as CSV to stdout. SSH-only; never run into the web root.'

    def handle(self, **options):
        writer = csv.writer(self.stdout)
        writer.writerow(['email', 'consent_at', 'consent_version', 'consent_text', 'unsubscribe_url'])
        for row in Subscriber.objects.order_by('consent_at'):
            safe_email = "'" + row.email if row.email.startswith(('=', '+', '-', '@')) else row.email
            writer.writerow([safe_email, row.consent_at.isoformat(), row.consent_version, row.consent_text,
                             'https://ishtarinsights.com/unsubscribe.html#' + row.unsubscribe_token])
