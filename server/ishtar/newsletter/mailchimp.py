"""The only module that talks to Mailchimp. Every function is a no-op without an API key."""
import base64
import hashlib
import json
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings

SIGNS = ('aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio',
         'sagittarius', 'capricorn', 'aquarius', 'pisces')
PAGE = 1000


def configured():
    return bool(settings.MAILCHIMP_API_KEY)


def _request(method, path, body=None, params=None):
    url = f'https://{settings.MAILCHIMP_SERVER}.api.mailchimp.com/3.0{path}'
    if params:
        url += '?' + urllib.parse.urlencode(params)
    data = json.dumps(body).encode() if body is not None else None
    auth = base64.b64encode(f'anystring:{settings.MAILCHIMP_API_KEY}'.encode()).decode()
    headers = {'Authorization': f'Basic {auth}'}
    if data is not None:
        headers['Content-Type'] = 'application/json'
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=5) as response:
        return json.load(response)


def _hash(email):
    return hashlib.md5(email.lower().encode()).hexdigest()


def push(subscriber, resubscribe=False):
    if not configured():
        return
    path = f'/lists/{settings.MAILCHIMP_AUDIENCE_ID}/members/{_hash(subscriber.email)}'
    member = _request('PUT', path, {
        'email_address': subscriber.email,
        # status_if_new only: a push must never resubscribe someone who left inside Mailchimp.
        'status_if_new': 'pending',
        'merge_fields': {'SIGN': subscriber.sun_sign,
                         'SITEUNSUB': 'https://ishtarinsights.com/unsubscribe.html#' + subscriber.unsubscribe_token},
    })
    # A fresh signup on the site is fresh consent; pending makes Mailchimp send a new confirmation.
    if resubscribe and member.get('status') == 'unsubscribed':
        _request('PATCH', path, {'status': 'pending'})


def remove(email):
    if not configured():
        return
    path = f'/lists/{settings.MAILCHIMP_AUDIENCE_ID}/members/{_hash(email)}'
    try:
        _request('PATCH', path, {'status': 'unsubscribed'})
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise


def members():
    if not configured():
        return
    offset = 0
    while True:
        page = _request('GET', f'/lists/{settings.MAILCHIMP_AUDIENCE_ID}/members', params={
            'count': PAGE, 'offset': offset,
            'fields': 'members.email_address,members.status,total_items',
        })
        for member in page['members']:
            yield member['email_address'].lower(), member['status']
        offset += PAGE
        if offset >= page['total_items']:
            return
