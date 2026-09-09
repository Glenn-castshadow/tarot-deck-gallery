"""Small, private newsletter capture service. Does not send email."""
import csv
import json
import os
import re
import secrets
import sqlite3
import sys
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer

DB = os.environ.get('NEWSLETTER_DB', '/var/lib/ishtar-newsletter/subscribers.sqlite3')
CONSENT_VERSION = '2026-09-09-v1'
CONSENT_TEXT = 'Yes, email me the Ishtar Insights newsletter and occasional updates about new readings and features.'
ORIGINS = {'https://ishtarinsights.com', 'https://www.ishtarinsights.com'}
EMAIL = re.compile(r"[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+\Z")


@contextmanager
def connect():
    db = sqlite3.connect(DB, timeout=5)
    db.execute('''CREATE TABLE IF NOT EXISTS subscribers (
      email TEXT PRIMARY KEY, consent_at TEXT NOT NULL,
      consent_version TEXT NOT NULL, consent_text TEXT NOT NULL,
      unsubscribe_token TEXT NOT NULL UNIQUE)''')
    try:
        with db:
            yield db
    finally:
        db.close()


def subscribe(data):
    if not isinstance(data, dict) or set(data) != {'email', 'consent', 'consentVersion'}:
        raise ValueError('Please submit only an email and signup permission.')
    email = data['email']
    if not isinstance(email, str):
        raise ValueError('Enter a valid email address.')
    email = email.strip().lower()
    if len(email) > 254 or not EMAIL.fullmatch(email) or len(email.split('@')[0]) > 64:
        raise ValueError('Enter a valid email address.')
    if data['consent'] is not True or data['consentVersion'] != CONSENT_VERSION:
        raise ValueError('Please check the newsletter permission box.')
    token = secrets.token_urlsafe(32)
    with connect() as db:
        result = db.execute('INSERT OR IGNORE INTO subscribers VALUES (?, ?, ?, ?, ?)',
          (email, datetime.now(timezone.utc).isoformat(), CONSENT_VERSION, CONSENT_TEXT, token))
    # Never reveal whether an address was already present or expose its management token.
    return {'ok': True}


def unsubscribe(data):
    if isinstance(data, dict) and set(data) == {'email'} and isinstance(data['email'], str) and len(data['email']) <= 254 and EMAIL.fullmatch(data['email'].strip().lower()):
        with connect() as db:
            db.execute('DELETE FROM subscribers WHERE email = ?', (data['email'].strip().lower(),))
        return {'ok': True}
    if not isinstance(data, dict) or set(data) != {'token'} or not isinstance(data['token'], str) or not re.fullmatch(r'[A-Za-z0-9_-]{43}', data['token']):
        raise ValueError('Use the full unsubscribe link provided with your email.')
    with connect() as db:
        db.execute('DELETE FROM subscribers WHERE unsubscribe_token = ?', (data['token'],))
    return {'ok': True}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # Do not log addresses, tokens or request bodies.

    def reply(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self.reply(200 if self.path == '/health' else 404, {'ok': self.path == '/health'})

    def do_POST(self):
        if self.path not in {'/api/newsletter/subscribe', '/api/newsletter/unsubscribe'}:
            return self.reply(404, {'error': 'Not found.'})
        if self.headers.get('Origin') not in ORIGINS:
            return self.reply(403, {'error': 'Please use the form on Ishtar Insights.'})
        if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
            return self.reply(415, {'error': 'JSON required.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length < 1 or length > 1024:
                return self.reply(413, {'error': 'Invalid request size.'})
            self.connection.settimeout(5)
            data = json.loads(self.rfile.read(length))
            result = subscribe(data) if self.path.endswith('/subscribe') else unsubscribe(data)
            self.reply(200, result)
        except (ValueError, UnicodeError):
            self.reply(400, {'error': 'Check your email and newsletter permission, then try again.'})
        except (sqlite3.Error, OSError):
            self.reply(503, {'error': 'Signup is temporarily unavailable. Please try again later.'})


if __name__ == '__main__':
    os.umask(0o077)
    with connect():
        pass
    if '--export' in sys.argv:
        # SSH-only export; CSV is never created in the public web root.
        writer = csv.writer(sys.stdout)
        writer.writerow(['email', 'consent_at', 'consent_version', 'consent_text', 'unsubscribe_url'])
        with connect() as db:
            for email, at, version, consent, token in db.execute('SELECT * FROM subscribers ORDER BY consent_at'):
                # Prevent spreadsheet formula execution when opening the CSV.
                safe_email = "'" + email if email.startswith(('=', '+', '-', '@')) else email
                writer.writerow([safe_email, at, version, consent, 'https://ishtarinsights.com/unsubscribe.html#' + token])
    else:
        HTTPServer(('127.0.0.1', int(os.environ.get('PORT', '8137'))), Handler).serve_forever()
