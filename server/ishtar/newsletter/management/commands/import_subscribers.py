import sqlite3
from datetime import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from newsletter.models import Subscriber


class Command(BaseCommand):
    help = 'Import rows from the retired stdlib newsletter SQLite file. Existing emails are left untouched.'

    def add_arguments(self, parser):
        parser.add_argument('path')

    def handle(self, path, **options):
        db = sqlite3.connect(f'file:{path}?mode=ro', uri=True)
        rows = db.execute('SELECT email, consent_at, consent_version, consent_text, unsubscribe_token FROM subscribers').fetchall()
        db.close()
        imported = 0
        for email, at, version, text, token in rows:
            when = datetime.fromisoformat(at)
            if timezone.is_naive(when):
                when = timezone.make_aware(when, timezone.utc)
            _, created = Subscriber.objects.get_or_create(email=email.strip().lower(), defaults={
                'consent_at': when, 'consent_version': version, 'consent_text': text, 'unsubscribe_token': token})
            imported += int(created)
        self.stdout.write(f'read {len(rows)}, imported {imported}, total now {Subscriber.objects.count()}')
