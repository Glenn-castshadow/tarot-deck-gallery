"""The only module that talks to Mailchimp. Every function is a no-op without an API key."""
import hashlib

from django.conf import settings

SIGNS = ('aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio',
         'sagittarius', 'capricorn', 'aquarius', 'pisces')
PAGE = 1000


def configured():
    return bool(settings.MAILCHIMP_API_KEY)


def _client():
    if not configured():
        return None
    import mailchimp_marketing
    client = mailchimp_marketing.Client()
    client.set_config({'api_key': settings.MAILCHIMP_API_KEY, 'server': settings.MAILCHIMP_SERVER, 'timeout': 5})
    return client


def _hash(email):
    return hashlib.md5(email.lower().encode()).hexdigest()


def push(subscriber, resubscribe=False):
    client = _client()
    if client is None:
        return
    member = client.lists.set_list_member(settings.MAILCHIMP_AUDIENCE_ID, _hash(subscriber.email), {
        'email_address': subscriber.email,
        # status_if_new only: a push must never resubscribe someone who left inside Mailchimp.
        'status_if_new': 'pending',
        'merge_fields': {'SIGN': subscriber.sun_sign,
                         'UNSUB': 'https://ishtarinsights.com/unsubscribe.html#' + subscriber.unsubscribe_token},
    })
    # A fresh signup on the site is fresh consent; pending makes Mailchimp send a new confirmation.
    if resubscribe and member.get('status') == 'unsubscribed':
        client.lists.update_list_member(settings.MAILCHIMP_AUDIENCE_ID, _hash(subscriber.email), {'status': 'pending'})


def remove(email):
    client = _client()
    if client is None:
        return
    from mailchimp_marketing.api_client import ApiClientError
    try:
        client.lists.update_list_member(settings.MAILCHIMP_AUDIENCE_ID, _hash(email), {'status': 'unsubscribed'})
    except ApiClientError as error:
        if error.status_code != 404:
            raise


def members():
    client = _client()
    if client is None:
        return
    offset = 0
    while True:
        page = client.lists.get_list_members_info(settings.MAILCHIMP_AUDIENCE_ID, count=PAGE, offset=offset,
                                                  fields=['members.email_address', 'members.status', 'total_items'])
        for member in page['members']:
            yield member['email_address'].lower(), member['status']
        offset += PAGE
        if offset >= page['total_items']:
            return
