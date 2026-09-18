# Newsletter Audience Sync to Mailchimp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep a Mailchimp audience in step with the VPS `newsletter_subscriber` table, with an optional sun sign per subscriber and Mailchimp's confirmation email as double opt-in.

**Architecture:** The Django database stays the source of truth. Views make a best-effort inline Mailchimp call after each change; a `sync_mailchimp` management command on a 10-minute cron does a full two-way set diff as the safety net and the only route for Mailchimp-side unsubscribes. One module, `newsletter/mailchimp.py`, is the only code that touches the SDK, and it does nothing when no API key is configured.

**Tech Stack:** Django 5.2 (server/ishtar), `mailchimp-marketing` (official SDK, Apache 2.0), classic-script browser JS, `node --test`, Django `TestCase`.

**Spec:** `docs/superpowers/specs/2026-09-18-newsletter-mailchimp-sync-design.md`

## Global Constraints

| Constraint | Source |
|---|---|
| Dependencies are open source | Glenn's global instructions |
| A Mailchimp failure never fails a signup or unsubscribe; inline calls time out at 5 seconds | Spec (Claude's judgement) |
| No birth details stored with a subscriber; the server never derives a sign from a birth profile | Existing `docs/NEWSLETTER.md` rule, extended in the spec |
| Subscriber addresses never appear in logs, command output, Git or Honcho | Existing `docs/NEWSLETTER.md` rule |
| The API key is put in `/etc/ishtar-app.env` by Glenn; never committed, never written by a script. `deploy-app.sh` must keep never writing that file | Spec; existing `ishtar-app.env.example` rule |
| Public endpoint responses stay `{"ok": true}` / 400 / 403 / 413 / 415 exactly as now | Existing contract tests |
| Consent version is `2026-09-18-v2`; consent text is exactly: `Yes, email me the Ishtar Insights newsletter and occasional updates about new readings and features. Emails are sent through Mailchimp.` | Spec |
| Sign values are exactly: `aries taurus gemini cancer leo virgo libra scorpio sagittarius capricorn aquarius pisces` | Spec |
| Every new test is run and seen to fail before its implementation exists | Glenn's memory "fix-round tests need RED evidence" |
| Branch: `newsletter-mailchimp`. Do not deploy. | Claude's judgement |

**Test commands** (run from the repo root unless stated):

- Django: `cd server/ishtar && .venv/Scripts/python.exe manage.py test newsletter accounts`
- JS: `node --test tests/*.test.cjs`

**One amendment to the spec, found while planning:** a person who unsubscribed inside Mailchimp and later signs up again on the site would be stored, pushed without a status change, and then deleted by the next reconcile, so they could never rejoin. Task 1's `push(subscriber, resubscribe=True)` fixes this by moving an `unsubscribed` member back to `pending`, which makes Mailchimp send a fresh confirmation email. Only the inline signup path passes `resubscribe=True`; the reconcile never does. Task 5 records this in the spec.

## File Structure

| File | Responsibility |
|---|---|
| `server/ishtar/newsletter/mailchimp.py` (new) | The only SDK importer: `SIGNS`, `configured()`, `push`, `remove`, `members` |
| `server/ishtar/newsletter/models.py` | `Subscriber.sun_sign` |
| `server/ishtar/newsletter/views.py` | Optional `sunSign`, inline push/remove through `safely()` |
| `server/ishtar/accounts/views.py` | Account toggle passes the sign and removes on off |
| `server/ishtar/newsletter/management/commands/sync_mailchimp.py` (new) | The reconcile |
| `server/deploy-app.sh` | Installs the 10-minute cron entry |
| `newsletter.js`, `account-core.js`, `charts/index.html`, `eastern/index.html`, `numerology/index.html` | Optional sign select, new consent text and version |
| `newsletter-privacy.html`, `docs/NEWSLETTER.md` | Provider disclosure and ops notes |

---

### Task 1: Mailchimp module, settings and the `sun_sign` field

**Files:**
- Create: `server/ishtar/newsletter/mailchimp.py`
- Create: `server/ishtar/newsletter/tests/test_mailchimp.py`
- Create: `server/ishtar/newsletter/migrations/000N_subscriber_sun_sign.py` (generated)
- Modify: `server/ishtar/newsletter/models.py`
- Modify: `server/ishtar/ishtar/settings.py:158-160`
- Modify: `server/ishtar/requirements.txt`
- Modify: `server/ishtar-app.env.example` (append at end)

**Interfaces:**
- Produces:
  - `newsletter.mailchimp.SIGNS: tuple[str, ...]` — the twelve names, in zodiac order.
  - `newsletter.mailchimp.configured() -> bool`
  - `newsletter.mailchimp.push(subscriber, resubscribe=False) -> None` — may raise.
  - `newsletter.mailchimp.remove(email: str) -> None` — may raise; a 404 is swallowed.
  - `newsletter.mailchimp.members() -> Iterator[tuple[str, str]]` — `(lowercase email, status)`.
  - `Subscriber.sun_sign: str` — blank or one of `SIGNS`.
  - Settings `MAILCHIMP_API_KEY`, `MAILCHIMP_SERVER`, `MAILCHIMP_AUDIENCE_ID` (strings, default `''`).

- [ ] **Step 1: Install the SDK and pin it**

```bash
cd server/ishtar && .venv/Scripts/python.exe -m pip install mailchimp-marketing && .venv/Scripts/python.exe -m pip show mailchimp-marketing
```

Append `mailchimp-marketing==<the version pip show printed>` to `server/ishtar/requirements.txt`. Confirm the licence line reads Apache 2.0.

- [ ] **Step 2: Write the failing tests**

`server/ishtar/newsletter/tests/test_mailchimp.py`:

```python
import hashlib
from unittest import mock

from django.test import TestCase, override_settings
from django.utils import timezone

from newsletter import mailchimp
from newsletter.models import Subscriber

CONFIG = dict(MAILCHIMP_API_KEY='k-us1', MAILCHIMP_SERVER='us1', MAILCHIMP_AUDIENCE_ID='aud1')
HASH = hashlib.md5(b'reader@example.com').hexdigest()


def subscriber(sign='leo'):
    return Subscriber.objects.create(email='reader@example.com', consent_at=timezone.now(),
                                     consent_version='v', consent_text='t', sun_sign=sign)


class FakeLists:
    def __init__(self, status='pending', pages=None):
        self.status, self.pages, self.calls = status, pages or [], []

    def set_list_member(self, list_id, member_hash, body):
        self.calls.append(('set', list_id, member_hash, body))
        return {'status': self.status}

    def update_list_member(self, list_id, member_hash, body):
        self.calls.append(('update', list_id, member_hash, body))
        return {}

    def get_list_members_info(self, list_id, count, offset, fields):
        self.calls.append(('list', offset))
        return self.pages[offset // count]


def fake_client(lists):
    return mock.patch('newsletter.mailchimp._client', return_value=mock.Mock(lists=lists))


class UnconfiguredTests(TestCase):
    def test_no_key_means_no_client_and_no_calls(self):
        with mock.patch('mailchimp_marketing.Client') as sdk:
            self.assertFalse(mailchimp.configured())
            mailchimp.push(subscriber())
            mailchimp.remove('reader@example.com')
            self.assertEqual(list(mailchimp.members()), [])
            sdk.assert_not_called()


@override_settings(**CONFIG)
class ConfiguredTests(TestCase):
    def test_push_puts_pending_with_sign_and_unsubscribe_url(self):
        lists, row = FakeLists(), subscriber()
        with fake_client(lists):
            mailchimp.push(row)
        self.assertEqual(lists.calls, [('set', 'aud1', HASH, {
            'email_address': 'reader@example.com', 'status_if_new': 'pending',
            'merge_fields': {'SIGN': 'leo', 'SITEUNSUB': 'https://ishtarinsights.com/unsubscribe.html#' + row.unsubscribe_token}})])

    def test_push_never_sends_status_so_an_unsubscribed_member_stays_out(self):
        lists = FakeLists(status='unsubscribed')
        with fake_client(lists):
            mailchimp.push(subscriber())
        self.assertEqual([c[0] for c in lists.calls], ['set'])
        self.assertNotIn('status', lists.calls[0][3])

    def test_resubscribe_moves_an_unsubscribed_member_back_to_pending(self):
        lists = FakeLists(status='unsubscribed')
        with fake_client(lists):
            mailchimp.push(subscriber(), resubscribe=True)
        self.assertEqual(lists.calls[1], ('update', 'aud1', HASH, {'status': 'pending'}))

    def test_resubscribe_leaves_a_subscribed_member_alone(self):
        lists = FakeLists(status='subscribed')
        with fake_client(lists):
            mailchimp.push(subscriber(), resubscribe=True)
        self.assertEqual([c[0] for c in lists.calls], ['set'])

    def test_remove_unsubscribes_and_treats_404_as_done(self):
        lists = FakeLists()
        with fake_client(lists):
            mailchimp.remove('Reader@Example.com')
        self.assertEqual(lists.calls, [('update', 'aud1', HASH, {'status': 'unsubscribed'})])

        from mailchimp_marketing.api_client import ApiClientError
        gone = mock.Mock()
        gone.update_list_member.side_effect = ApiClientError('missing', 404)
        with fake_client(gone):
            mailchimp.remove('reader@example.com')
        broken = mock.Mock()
        broken.update_list_member.side_effect = ApiClientError('boom', 500)
        with fake_client(broken), self.assertRaises(ApiClientError):
            mailchimp.remove('reader@example.com')

    def test_members_pages_until_total_and_lowercases(self):
        page = lambda n, total: {'total_items': total, 'members': [{'email_address': f'P{n}@Example.com', 'status': 'subscribed'}]}
        lists = FakeLists(pages=[page(0, 1001), page(1, 1001)])
        with fake_client(lists):
            self.assertEqual(list(mailchimp.members()), [('p0@example.com', 'subscribed'), ('p1@example.com', 'subscribed')])
        self.assertEqual(lists.calls, [('list', 0), ('list', 1000)])

    def test_client_is_built_with_a_five_second_timeout(self):
        with mock.patch('mailchimp_marketing.Client') as sdk:
            mailchimp._client()
        sdk.return_value.set_config.assert_called_once_with({'api_key': 'k-us1', 'server': 'us1', 'timeout': 5})
```

Before relying on `ApiClientError('missing', 404)`, open `.venv/Lib/site-packages/mailchimp_marketing/api_client.py` and confirm the constructor is `(text, status_code)` and the attribute is `status_code`. If it differs, match the SDK in both the test and Step 4.

- [ ] **Step 3: Run the tests and see them fail**

Run: `cd server/ishtar && .venv/Scripts/python.exe manage.py test newsletter.tests.test_mailchimp`
Expected: ERROR, `cannot import name 'mailchimp' from 'newsletter'`.

- [ ] **Step 4: Implement**

`server/ishtar/ishtar/settings.py`, replacing the two consent lines and adding three settings below them:

```python
NEWSLETTER_CONSENT_VERSION = '2026-09-18-v2'
NEWSLETTER_CONSENT_TEXT = 'Yes, email me the Ishtar Insights newsletter and occasional updates about new readings and features. Emails are sent through Mailchimp.'
# Empty key = every newsletter.mailchimp call is a no-op, so dev and tests stay offline.
MAILCHIMP_API_KEY = os.environ.get('MAILCHIMP_API_KEY', '')
MAILCHIMP_SERVER = os.environ.get('MAILCHIMP_SERVER', '')
MAILCHIMP_AUDIENCE_ID = os.environ.get('MAILCHIMP_AUDIENCE_ID', '')
```

`server/ishtar/newsletter/mailchimp.py`:

```python
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
                         'SITEUNSUB': 'https://ishtarinsights.com/unsubscribe.html#' + subscriber.unsubscribe_token},
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
```

`server/ishtar/newsletter/models.py` — add the field (import inside the class body is avoided by listing the choices from the module):

```python
from .mailchimp import SIGNS
```

at the top, and inside `Subscriber`:

```python
    sun_sign = models.CharField(max_length=11, blank=True, default='', choices=[(s, s.title()) for s in SIGNS])
```

Then: `cd server/ishtar && .venv/Scripts/python.exe manage.py makemigrations newsletter -n subscriber_sun_sign`

Append to `server/ishtar-app.env.example`:

```
# Mailchimp audience sync (docs/NEWSLETTER.md). Glenn adds these by hand; leave
# MAILCHIMP_API_KEY unset to keep every Mailchimp call a no-op.
#   MAILCHIMP_API_KEY=<key>-usNN
#   MAILCHIMP_SERVER=usNN
#   MAILCHIMP_AUDIENCE_ID=<audience id>
```

- [ ] **Step 5: Run the tests and see them pass**

Run: `cd server/ishtar && .venv/Scripts/python.exe manage.py test newsletter.tests.test_mailchimp`
Expected: 8 tests, OK. (The rest of the `newsletter` suite fails until Task 2 because the consent version changed; that is expected here.)

- [ ] **Step 6: Commit**

```bash
git add server/ishtar/newsletter server/ishtar/ishtar/settings.py server/ishtar/requirements.txt server/ishtar-app.env.example
git commit -m "feat(newsletter): Mailchimp module, sun_sign field and consent v2"
```

---

### Task 2: Views push to Mailchimp and accept an optional sign

**Files:**
- Modify: `server/ishtar/newsletter/views.py`
- Modify: `server/ishtar/accounts/views.py:185-198`
- Modify: `server/ishtar/newsletter/tests/test_newsletter.py` (the `PAYLOAD` constant on line 14, the `consent_version` assertion near line 30, plus a new class)

**Interfaces:**
- Consumes: `mailchimp.SIGNS`, `mailchimp.push(subscriber, resubscribe=False)`, `mailchimp.remove(email)`, `Subscriber.sun_sign`.
- Produces:
  - `newsletter.views.safely(call, *args, **kwargs) -> None` — runs a Mailchimp call, logs and swallows any exception.
  - `newsletter.views.clean_sign(value) -> str` — returns the sign or raises `ValueError`.
  - `newsletter.views.subscribe_email(email, sun_sign='') -> None`
  - `newsletter.views.unsubscribe_email(email) -> None`
  - Public `POST /api/newsletter/subscribe` accepts optional `sunSign`.
  - `POST /api/account/newsletter/` accepts optional `sunSign` beside `subscribed`.

- [ ] **Step 1: Update the existing constant and write the failing tests**

In `test_newsletter.py` change line 14 to use `'consentVersion': '2026-09-18-v2'` and the `consent_version` assertion to `'2026-09-18-v2'`. Add `from unittest import mock` to the imports and append:

```python
@override_settings(NEWSLETTER_ORIGINS={ORIGIN})
class MailchimpHookTests(TestCase):
    def post(self, path, body):
        return self.client.post(path, body, content_type='application/json', HTTP_ORIGIN=ORIGIN)

    def test_subscribe_stores_the_sign_and_pushes_with_resubscribe(self):
        with mock.patch('newsletter.mailchimp.push') as push:
            self.assertEqual(self.post('/api/newsletter/subscribe', dict(PAYLOAD, sunSign='leo')).status_code, 200)
        row = Subscriber.objects.get(email='test@example.com')
        self.assertEqual(row.sun_sign, 'leo')
        push.assert_called_once_with(row, resubscribe=True)

    def test_repeat_signup_updates_the_sign_but_a_blank_one_keeps_it(self):
        with mock.patch('newsletter.mailchimp.push'):
            self.post('/api/newsletter/subscribe', dict(PAYLOAD, sunSign='leo'))
            self.post('/api/newsletter/subscribe', dict(PAYLOAD, sunSign='virgo'))
            self.assertEqual(Subscriber.objects.get().sun_sign, 'virgo')
            self.post('/api/newsletter/subscribe', PAYLOAD)
            self.assertEqual(Subscriber.objects.get().sun_sign, 'virgo')

    def test_a_sign_outside_the_twelve_is_rejected_and_nothing_is_stored(self):
        with mock.patch('newsletter.mailchimp.push') as push:
            for bad in ['Leo', 'ophiuchus', '', 5, None]:
                self.assertEqual(self.post('/api/newsletter/subscribe', dict(PAYLOAD, sunSign=bad)).status_code, 400)
        self.assertEqual(Subscriber.objects.count(), 0)
        push.assert_not_called()

    def test_signup_survives_a_mailchimp_failure_and_logs_no_address(self):
        with mock.patch('newsletter.mailchimp.push', side_effect=RuntimeError('test@example.com down')), \
                self.assertLogs('newsletter', level='WARNING') as logs:
            self.assertEqual(self.post('/api/newsletter/subscribe', PAYLOAD).json(), {'ok': True})
        self.assertTrue(Subscriber.objects.filter(email='test@example.com').exists())
        self.assertNotIn('test@example.com', ''.join(logs.output))

    def test_unsubscribe_by_email_and_by_token_both_remove_the_address(self):
        for key in ('email', 'token'):
            with mock.patch('newsletter.mailchimp.push'):
                self.post('/api/newsletter/subscribe', PAYLOAD)
            row = Subscriber.objects.get()
            body = {'email': 'Test@example.com'} if key == 'email' else {'token': row.unsubscribe_token}
            with mock.patch('newsletter.mailchimp.remove') as remove:
                self.assertEqual(self.post('/api/newsletter/unsubscribe', body).status_code, 200)
            remove.assert_called_once_with('test@example.com')
            self.assertEqual(Subscriber.objects.count(), 0)

    def test_unsubscribe_survives_a_mailchimp_failure(self):
        with mock.patch('newsletter.mailchimp.push'):
            self.post('/api/newsletter/subscribe', PAYLOAD)
        with mock.patch('newsletter.mailchimp.remove', side_effect=RuntimeError('down')):
            self.assertEqual(self.post('/api/newsletter/unsubscribe', {'email': 'test@example.com'}).json(), {'ok': True})
        self.assertEqual(Subscriber.objects.count(), 0)

    def test_an_unknown_token_makes_no_mailchimp_call(self):
        with mock.patch('newsletter.mailchimp.remove') as remove:
            self.assertEqual(self.post('/api/newsletter/unsubscribe', {'token': 'a' * 43}).status_code, 200)
        remove.assert_not_called()

    def test_account_toggle_passes_the_sign_and_removes_when_turned_off(self):
        user = get_user_model().objects.create_user('reader@example.com')
        self.client.force_login(user)
        with mock.patch('newsletter.mailchimp.push') as push:
            on = self.client.post('/api/account/newsletter/', {'subscribed': True, 'sunSign': 'pisces'}, content_type='application/json')
        self.assertEqual(on.json(), {'ok': True, 'newsletter': True})
        self.assertEqual(Subscriber.objects.get().sun_sign, 'pisces')
        push.assert_called_once()
        bad = self.client.post('/api/account/newsletter/', {'subscribed': True, 'sunSign': 'x'}, content_type='application/json')
        self.assertEqual(bad.status_code, 400)
        with mock.patch('newsletter.mailchimp.remove') as remove:
            self.client.post('/api/account/newsletter/', {'subscribed': False}, content_type='application/json')
        remove.assert_called_once_with('reader@example.com')
        self.assertEqual(Subscriber.objects.count(), 0)
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `cd server/ishtar && .venv/Scripts/python.exe manage.py test newsletter.tests.test_newsletter.MailchimpHookTests`
Expected: FAIL. The `sunSign` payloads return 400 (`set(data) != {...}`), and `push`/`remove` are never called.

- [ ] **Step 3: Implement the views**

In `server/ishtar/newsletter/views.py` add to the imports:

```python
import logging

from . import mailchimp

logger = logging.getLogger('newsletter')
```

Replace `subscribe_email`, `subscribe` and `unsubscribe` with:

```python
def safely(call, *args, **kwargs):
    """Mailchimp must never fail a signup; sync_mailchimp repairs whatever this drops."""
    try:
        call(*args, **kwargs)
    except Exception as error:
        # The exception type only: SDK messages can carry the address.
        logger.warning('mailchimp %s failed: %s', getattr(call, '__name__', 'call'), type(error).__name__)


def clean_sign(value):
    if value not in mailchimp.SIGNS:
        raise ValueError('Choose one of the twelve signs.')
    return value


def subscribe_email(email, sun_sign=''):
    """Idempotent insert used by both the public endpoint and the account toggle."""
    row, created = Subscriber.objects.get_or_create(email=email, defaults={
        'consent_at': timezone.now(),
        'consent_version': settings.NEWSLETTER_CONSENT_VERSION,
        'consent_text': settings.NEWSLETTER_CONSENT_TEXT,
        'sun_sign': sun_sign,
    })
    if not created and sun_sign and row.sun_sign != sun_sign:
        row.sun_sign = sun_sign
        row.save(update_fields=['sun_sign'])
    safely(mailchimp.push, row, resubscribe=True)


def unsubscribe_email(email):
    if Subscriber.objects.filter(email=email).delete()[0]:
        safely(mailchimp.remove, email)


def subscribe(data):
    if not isinstance(data, dict) or not {'email', 'consent', 'consentVersion'} <= set(data) <= {'email', 'consent', 'consentVersion', 'sunSign'}:
        raise ValueError('Please submit only an email, signup permission and an optional sign.')
    email = clean_email(data['email'])
    if data['consent'] is not True or data['consentVersion'] != settings.NEWSLETTER_CONSENT_VERSION:
        raise ValueError('Please check the newsletter permission box.')
    subscribe_email(email, clean_sign(data['sunSign']) if 'sunSign' in data else '')
    return {'ok': True}


def unsubscribe(data):
    if isinstance(data, dict) and set(data) == {'email'}:
        unsubscribe_email(clean_email(data['email']))
        return {'ok': True}
    if not isinstance(data, dict) or set(data) != {'token'} or not isinstance(data['token'], str) or not TOKEN.fullmatch(data['token']):
        raise ValueError('Use the full unsubscribe link provided with your email.')
    row = Subscriber.objects.filter(unsubscribe_token=data['token']).first()
    if row:
        unsubscribe_email(row.email)
    return {'ok': True}
```

`clean_sign` needs no `isinstance` check: membership in a tuple of strings is a plain equality scan, so `5`, `None`, a list or a dict all fall through to `ValueError`.

`mock.patch('newsletter.mailchimp.push')` swaps the attribute on the module, and `safely(mailchimp.push, ...)` reads it at call time, so the patch takes effect. A `MagicMock` has no `__name__`, which is why the log line uses `getattr(call, '__name__', 'call')`.

In `server/ishtar/accounts/views.py` replace the import and the view:

```python
from newsletter.views import clean_sign, subscribe_email, unsubscribe_email


@json_view(methods=('POST',))
@auth_required
def newsletter(request):
    if not {'subscribed'} <= set(request.json) <= {'subscribed', 'sunSign'} or not isinstance(request.json['subscribed'], bool):
        return error('Send {"subscribed": true or false} and an optional sunSign.')
    try:
        sign = clean_sign(request.json['sunSign']) if 'sunSign' in request.json else ''
    except ValueError as problem:
        return error(str(problem))
    if request.json['subscribed']:
        subscribe_email(request.user.email, sign)
    else:
        unsubscribe_email(request.user.email)
    return JsonResponse({'ok': True, 'newsletter': request.json['subscribed']})
```

Keep the `Subscriber` import in that file; line 122 still uses it.

- [ ] **Step 4: Run both Django suites**

Run: `cd server/ishtar && .venv/Scripts/python.exe manage.py test newsletter accounts`
Expected: OK, no failures. `test_validation_matches_old_service` still returns 400 for `birthday='1990-01-01'` because that key is outside the allowed set.

- [ ] **Step 5: Show one test is RED without the fix**

Temporarily change `safely(mailchimp.remove, email)` to `pass`, run `MailchimpHookTests.test_unsubscribe_by_email_and_by_token_both_remove_the_address`, see it FAIL, restore the line, run again, see it PASS. Put both outputs in the task report.

- [ ] **Step 6: Commit**

```bash
git add server/ishtar/newsletter server/ishtar/accounts/views.py
git commit -m "feat(newsletter): signup, unsubscribe and the account toggle push to Mailchimp"
```

---

### Task 3: The `sync_mailchimp` reconcile and its cron entry

**Files:**
- Create: `server/ishtar/newsletter/management/commands/sync_mailchimp.py`
- Create: `server/ishtar/newsletter/tests/test_sync.py`
- Modify: `server/deploy-app.sh` (after the backup cron lines, currently 91-93)

**Interfaces:**
- Consumes: `mailchimp.configured()`, `mailchimp.members()`, `mailchimp.push(subscriber)`, `mailchimp.remove(email)`.
- Produces: `manage.py sync_mailchimp`, printing `pushed=N removed=N deleted=N`; `/etc/cron.d/ishtar-app-mailchimp`.

- [ ] **Step 1: Write the failing tests**

`server/ishtar/newsletter/tests/test_sync.py`:

```python
import io
from unittest import mock

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from newsletter.models import Subscriber


def row(email):
    return Subscriber.objects.create(email=email, consent_at=timezone.now(), consent_version='v', consent_text='t')


def run(audience, configured=True):
    out = io.StringIO()
    with mock.patch('newsletter.mailchimp.configured', return_value=configured), \
            mock.patch('newsletter.mailchimp.members', return_value=iter(audience)), \
            mock.patch('newsletter.mailchimp.push') as push, \
            mock.patch('newsletter.mailchimp.remove') as remove:
        call_command('sync_mailchimp', stdout=out)
    return push, remove, out.getvalue()


class SyncTests(TestCase):
    def test_database_only_row_is_pushed_without_resubscribe(self):
        new = row('new@example.com')
        push, remove, out = run([])
        push.assert_called_once_with(new)
        remove.assert_not_called()
        self.assertEqual(out.strip(), 'pushed=1 removed=0 deleted=0')

    def test_live_mailchimp_member_missing_from_database_is_removed(self):
        push, remove, out = run([('gone@example.com', 'subscribed'), ('waiting@example.com', 'pending')])
        self.assertEqual(sorted(c.args[0] for c in remove.call_args_list), ['gone@example.com', 'waiting@example.com'])
        self.assertEqual(out.strip(), 'pushed=0 removed=2 deleted=0')

    def test_member_who_left_or_bounced_in_mailchimp_is_deleted_here(self):
        row('left@example.com'); row('bounced@example.com'); row('stays@example.com')
        push, remove, out = run([('left@example.com', 'unsubscribed'), ('bounced@example.com', 'cleaned'), ('stays@example.com', 'subscribed')])
        self.assertEqual(list(Subscriber.objects.values_list('email', flat=True)), ['stays@example.com'])
        push.assert_not_called(); remove.assert_not_called()
        self.assertEqual(out.strip(), 'pushed=0 removed=0 deleted=2')

    def test_gone_on_both_sides_and_in_step_on_both_sides_do_nothing(self):
        row('both@example.com')
        push, remove, out = run([('both@example.com', 'pending'), ('old@example.com', 'unsubscribed')])
        push.assert_not_called(); remove.assert_not_called()
        self.assertEqual(out.strip(), 'pushed=0 removed=0 deleted=0')

    def test_unconfigured_run_touches_nothing(self):
        row('keep@example.com')
        push, remove, out = run([], configured=False)
        push.assert_not_called()
        self.assertIn('not configured', out)

    def test_output_never_contains_an_address(self):
        row('secret@example.com')
        self.assertNotIn('secret', run([('other@example.com', 'subscribed')])[2])

    def test_an_api_error_propagates_so_cron_reports_it(self):
        row('new@example.com')
        with mock.patch('newsletter.mailchimp.configured', return_value=True), \
                mock.patch('newsletter.mailchimp.members', return_value=iter([])), \
                mock.patch('newsletter.mailchimp.push', side_effect=RuntimeError('down')), \
                self.assertRaises(RuntimeError):
            call_command('sync_mailchimp', stdout=io.StringIO())
```

- [ ] **Step 2: Run and see them fail**

Run: `cd server/ishtar && .venv/Scripts/python.exe manage.py test newsletter.tests.test_sync`
Expected: ERROR, `Unknown command: 'sync_mailchimp'`.

- [ ] **Step 3: Implement the command**

`server/ishtar/newsletter/management/commands/sync_mailchimp.py`:

```python
from django.core.management.base import BaseCommand

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
        pushed = removed = 0
        for email, row in rows.items():
            if email not in audience:
                mailchimp.push(row)
                pushed += 1
        for email, status in audience.items():
            if status in LIVE and email not in rows:
                mailchimp.remove(email)
                removed += 1
        left = [email for email, status in audience.items() if status in GONE and email in rows]
        Subscriber.objects.filter(email__in=left).delete()
        self.stdout.write(f'pushed={pushed} removed={removed} deleted={len(left)}')
```

Errors are deliberately not caught: an exception makes `manage.py` exit non-zero and cron mails the traceback. Confirm by reading the SDK's `ApiClientError.__str__` that its message does not include the member address for the three calls used; if it does, wrap the loop body in `try/except` and re-raise `RuntimeError(type(error).__name__)`.

- [ ] **Step 4: Run and see them pass**

Run: `cd server/ishtar && .venv/Scripts/python.exe manage.py test newsletter.tests.test_sync`
Expected: 7 tests, OK.

- [ ] **Step 5: Add the cron entry to the deploy script**

In `server/deploy-app.sh`, directly after `chmod 644 /etc/cron.d/ishtar-app-backup`, add:

```sh
# Mailchimp reconcile every 10 minutes (docs/NEWSLETTER.md). Written whole on
# every run like the backup entry above, so re-deploying converges. The
# command is a no-op until Glenn adds MAILCHIMP_API_KEY to /etc/ishtar-app.env.
printf '*/10 * * * * root cd %s/app && set -a && . /etc/ishtar-app.env && set +a && DJANGO_SETTINGS_MODULE=ishtar.settings DJANGO_DB_PATH=/var/lib/ishtar-app/db.sqlite3 sudo -u ishtar-app -E %s/venv/bin/python manage.py sync_mailchimp >/dev/null\n' "$APP" "$APP" > /etc/cron.d/ishtar-app-mailchimp
chmod 644 /etc/cron.d/ishtar-app-mailchimp
```

`>/dev/null` drops the counts line; stderr (a traceback) still reaches cron mail. The env-sourcing form is copied from the export command in `docs/NEWSLETTER.md`. Check the script with `bash -n server/deploy-app.sh`; expected: no output. `%` is special in crontab lines; the line above contains none after `printf` expands `%s`, so verify by running the `printf` alone into a temp file and reading it.

- [ ] **Step 6: Commit**

```bash
git add server/ishtar/newsletter server/deploy-app.sh
git commit -m "feat(newsletter): sync_mailchimp reconciles the audience every ten minutes"
```

---

### Task 4: Sign select on the signup forms, consent v2 in the browser

**Files:**
- Modify: `newsletter.js`
- Modify: `account-core.js:97-101`
- Modify: `charts/index.html:60-67,110`, and the same fieldset and script tag in `eastern/index.html` and `numerology/index.html`
- Modify: `tests/newsletter-ui.test.cjs`
- Modify: `tests/account-core.test.cjs:114-135`

**Interfaces:**
- Consumes: the API from Task 2 (`sunSign` optional on both endpoints).
- Produces: `IshtarAccount.setNewsletter(subscribed, sunSign)`; `<select id="newsletter-sign">`.

Spec deviation, on purpose: the select is preset only when a full natal chart is ready (`state.natal.points[0].index`). The daily horoscope's birthday-only approximation uses `zodiacFor`, which is private to `birth-lore.js`; exporting it for a convenience preset is not worth the coupling. A visitor with only a birthday picks their sign by hand.

- [ ] **Step 1: Write the failing UI tests**

In `tests/newsletter-ui.test.cjs`, change the `boot` helper so fetch bodies are captured and a birth profile can be supplied. Replace the `vm.runInNewContext(...)` line and the `return` line with:

```js
  const bodies=[]; let loaded;
  const win={IshtarAccount:account,IshtarStorage:{getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value)},addEventListener:(type,fn)=>{if(type==='load')loaded=fn;},BirthProfile:profile?{subscribe(fn){fn(profile);}}:undefined};
  vm.runInNewContext(fs.readFileSync(require.resolve('../newsletter.js'),'utf8'),{window:win,document,AbortSignal,fetch:async(url,init)=>{calls++;bodies.push(JSON.parse(init.body));return {ok,status:ok?200:500};}});
  return {nodes,memory,document,bodies,load:()=>loaded&&loaded(),get calls(){return calls;},get signArg(){return signArg;},submit:()=>node('#newsletter-form').handlers.submit({preventDefault(){}}),change(next){state=next;listener(state);}};
```

Add `profile=null` to `boot`'s destructured options, declare `let signArg;` beside `calls`, and make the fake `setNewsletter(value, sign)` record `signArg=sign`. The shared `node()` stub gives every element `value:'reader@example.com'`; tests that care set `node('#newsletter-sign').value` first. Append:

```js
test('a blank sign is left out of the payload and consent version is v2',async()=>{
  const b=boot(); b.document.querySelector('#newsletter-sign').value='';
  await b.submit();
  assert.deepEqual(b.bodies[0],{email:'reader@example.com',consent:true,consentVersion:'2026-09-18-v2'});
});
test('a chosen sign is sent as sunSign',async()=>{
  const b=boot(); b.document.querySelector('#newsletter-sign').value='leo';
  await b.submit();
  assert.equal(b.bodies[0].sunSign,'leo');
});
test('a signed-in member subscribing passes the sign to the account call',async()=>{
  const b=boot({state:{signedIn:true,email:'reader@example.com',newsletter:false}}); b.document.querySelector('#newsletter-sign').value='pisces';
  await b.submit();
  assert.equal(b.signArg,'pisces');
});
test('a ready natal chart presets a blank select on load and never overwrites a choice',()=>{
  const profile={natal:{status:'ready',points:[{index:4}]}};
  const blank=boot({profile}); blank.document.querySelector('#newsletter-sign').value=''; blank.load();
  assert.equal(blank.document.querySelector('#newsletter-sign').value,'leo');
  const chosen=boot({profile}); chosen.document.querySelector('#newsletter-sign').value='aries'; chosen.load();
  assert.equal(chosen.document.querySelector('#newsletter-sign').value,'aries');
  const none=boot(); none.document.querySelector('#newsletter-sign').value=''; none.load();
  assert.equal(none.document.querySelector('#newsletter-sign').value,'');
});
test('success tells the reader a confirmation email is coming',async()=>{
  const b=boot(); b.document.querySelector('#newsletter-sign').value=''; await b.submit();
  assert.match(b.nodes.get('#newsletter-status').textContent,/confirm/i);
});
```

The existing test `confirmed guest signup hides form...` asserts `/Thank you/`; keep those words in the new message so it still passes.

In `tests/account-core.test.cjs`, inside the test at line 114, add after the existing `setNewsletter(false)` assertions:

```js
  await account.setNewsletter(true, 'leo');
  assert.deepEqual(calls.at(-1).body, {subscribed: true, sunSign: 'leo'});
  await account.setNewsletter(true);
  assert.deepEqual(calls.at(-1).body, {subscribed: true});
```

Read lines 100-135 of that file first and use whatever name it gives its recorded-calls array in place of `calls`.

- [ ] **Step 2: Run and see them fail**

Run: `node --test tests/newsletter-ui.test.cjs tests/account-core.test.cjs`
Expected: the five new UI tests and the account-core test FAIL (payload has v1 and no `sunSign`; body lacks `sunSign`).

- [ ] **Step 3: Implement**

`newsletter.js` — after the `signup` const add:

```js
  const sign = document.querySelector('#newsletter-sign');
  const signs = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
  // birth-profile.js loads after this file; a full chart presets a blank select, never a chosen one.
  window.addEventListener('load', () => window.BirthProfile?.subscribe(state => {
    const index = state?.natal?.status === 'ready' ? state.natal.points[0].index : null;
    if (sign && !sign.value && signs[index]) sign.value = signs[index];
  }));
```

In the submit handler, after `const submittedEmail = ...` add `const sunSign = sign?.value || undefined;`, change the account call to `account.setNewsletter(true, sunSign)`, and change the fetch body to:

```js
          body: JSON.stringify({email: submittedEmail, consent: true, consentVersion: '2026-09-18-v2', ...(sunSign && {sunSign})}),
```

Change the success message to `'Thank you! Check your inbox for an email to confirm your signup.'` and reset the select beside the other fields: `if (sign) sign.value = '';`.

`account-core.js`:

```js
    async function setNewsletter(subscribed, sunSign) {
      const {status, data} = await call('POST', `${API}/account/newsletter/`, {subscribed: Boolean(subscribed), ...(sunSign && {sunSign})});
```

(the rest of the function is unchanged).

In each of `charts/index.html`, `eastern/index.html`, `numerology/index.html`, inside `<fieldset class="newsletter-signup">` directly after the email `<input>` line add:

```html
              <label for="newsletter-sign">Your sign <small>optional</small></label>
              <select id="newsletter-sign" form="newsletter-form"><option value="">No sign, general edition only</option><option value="aries">Aries</option><option value="taurus">Taurus</option><option value="gemini">Gemini</option><option value="cancer">Cancer</option><option value="leo">Leo</option><option value="virgo">Virgo</option><option value="libra">Libra</option><option value="scorpio">Scorpio</option><option value="sagittarius">Sagittarius</option><option value="capricorn">Capricorn</option><option value="aquarius">Aquarius</option><option value="pisces">Pisces</option></select>
```

replace the consent `<span>` text with the exact v2 consent text from Global Constraints, change the help paragraph's second sentence to `Only your email, your sign if you choose one, and signup permission are sent to us; your birth details stay in this browser.`, and bump the script tags to `/newsletter.js?v=3` and `/account-core.js?v=newsletter-sign-1`. The select carries `form="newsletter-form"` and is not `required`, so it cannot block the birth form's submit. `grep -rn "account-core.js?v=" --include=*.html .` and bump every page that loads it, not only these three.

- [ ] **Step 4: Run the whole JS suite**

Run: `node --test tests/*.test.cjs`
Expected: all pass. If `tests/pages.test.cjs` pins script versions or fieldset text, update its expectations to the new values.

- [ ] **Step 5: Check it in the browser**

Start the static preview from `.claude/launch.json`, open `/charts/` at 390px and at desktop width, and confirm: the select renders inside the fieldset in the site's form style (if it is unstyled, add the `#newsletter-sign` selector to the existing `.newsletter-signup input[type=email]` rule in `styles.css` rather than writing a new rule, and mind the memory that appended CSS beats earlier `@media` blocks); "Read my sky" still submits with the select blank; the console shows no errors. Guard check per the classic-script memory: `window.BirthProfile` is assigned explicitly in `birth-profile.js:36`, so `window.BirthProfile?.` is valid here.

- [ ] **Step 6: Commit**

```bash
git add newsletter.js account-core.js charts/index.html eastern/index.html numerology/index.html tests styles.css
git commit -m "feat(newsletter): optional sign on signup, consent text names Mailchimp"
```

---

### Task 5: Privacy page, ops notes and the spec amendment

**Files:**
- Modify: `newsletter-privacy.html`
- Modify: `cookie-policy.html` (only if it describes newsletter data; read it first)
- Modify: `docs/NEWSLETTER.md`
- Modify: `docs/superpowers/specs/2026-09-18-newsletter-mailchimp-sync-design.md`
- Modify: `tests/pages.test.cjs` (one assertion)

- [ ] **Step 1: Write the failing page test**

Append to `tests/pages.test.cjs` (match the file's existing `fs.readFileSync` idiom for reading a page):

```js
test('newsletter privacy names the delivery provider and what is shared', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'newsletter-privacy.html'), 'utf8');
  assert.match(html, /Mailchimp/);
  assert.match(html, /confirmation email/i);
  assert.doesNotMatch(html, /no delivery provider|not shared with any/i);
});
```

Run: `node --test tests/pages.test.cjs` — Expected: FAIL on `/Mailchimp/`.

- [ ] **Step 2: Update `newsletter-privacy.html`**

Read the whole page first; it is one long line. Replace any statement that no provider is used or that the address is not shared. Add, in the page's existing paragraph markup, these facts in plain sentences:

- Newsletter emails are delivered by Mailchimp, a service of Intuit Inc.
- We send Mailchimp three things: your email address, the sign you chose (if any), and your personal unsubscribe link. Birth details are never sent.
- After you sign up, Mailchimp sends one confirmation email. You are not on the list until you click its link.
- You can leave at any time from the link in any issue or from the site's unsubscribe page; either one removes you from both our database and Mailchimp within ten minutes.
- A link to Mailchimp's privacy policy: `https://www.intuit.com/privacy/statement/`.

Prose rules for this page: no em dashes, no "we take your privacy seriously" filler, and check every sentence that states a count or a position against the list above (memory: "check prose claims against the structure").

- [ ] **Step 3: Update `docs/NEWSLETTER.md`**

Add a section at the top, under the title:

```markdown
## Mailchimp audience sync (2026-09-18)

Design: `docs/superpowers/specs/2026-09-18-newsletter-mailchimp-sync-design.md`.

- The VPS table stays the source of truth. `newsletter/mailchimp.py` is the only code that talks
  to Mailchimp and does nothing while `MAILCHIMP_API_KEY` is unset.
- Signup, sign change and unsubscribe push inline (5 s timeout, failures swallowed and logged
  without the address). `manage.py sync_mailchimp` runs from `/etc/cron.d/ishtar-app-mailchimp`
  every 10 minutes and repairs any difference, including unsubscribes and bounces that happened
  inside Mailchimp. It prints counts only.
- New members enter Mailchimp as `pending`; Mailchimp's confirmation email is the double opt-in.
  Rows recorded under consent v1 are pushed the same way, so the confirmation is their fresh opt-in.
- Merge fields: `SIGN` (the chosen sun sign or empty) and `SITEUNSUB` (the VPS unsubscribe URL).
  Every campaign template must link `*|SITEUNSUB|*` or Mailchimp's own unsubscribe tag.
- Consent version `2026-09-18-v2` names Mailchimp. `Subscriber.sun_sign` is the only new stored field.
- Glenn's manual setup: audience with double opt-in on, the two merge fields, sending-domain
  authentication, and the three `MAILCHIMP_*` lines in `/etc/ishtar-app.env`.
- Not deployed yet.
```

Also strike the now-false line "No email is sent. Address ownership is NOT verified" by prefixing it with "Until 2026-09-18:".

- [ ] **Step 4: Amend the spec**

In the spec's `push(subscriber)` bullet, change the last sentence to: "It never sets `status`, so a reconcile push cannot resubscribe a member who left inside Mailchimp. The inline signup path calls `push(subscriber, resubscribe=True)`, which moves an `unsubscribed` member back to `pending` so a person who signs up again on the site gets a new confirmation email instead of being deleted by the next reconcile." In the front-end section, replace the preset sentence with: "When the visitor has a full natal chart, a blank select is preset from its Sun sign; a birthday-only profile is not used."

- [ ] **Step 5: Run everything**

Run: `node --test tests/*.test.cjs` and `cd server/ishtar && .venv/Scripts/python.exe manage.py test newsletter accounts`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add newsletter-privacy.html cookie-policy.html docs tests/pages.test.cjs
git commit -m "docs(newsletter): privacy page and ops notes for the Mailchimp sync"
```

---

## Not in this plan

Deployment. It waits on Glenn's four manual steps (spec, "What Glenn does by hand"). When those are done, deploy with the existing `server/deploy-app.sh` flow and the static release flow in `docs/deployment.md`, then run the spec's manual check with an address Glenn controls. Pieces 2 (weekly per-sign writer) and 3 (issue builder) get their own specs.

## Self-review notes

- Spec coverage: module (T1), model (T1), subscribe endpoint (T2), account toggle (T2), unsubscribe (T2), reconcile and cron (T3), front end (T4), consent and privacy (T1 settings, T4 markup, T5 page), error handling (T2 `safely`, T3 propagate), tests 1-7 (T1-T3), UI tests (T4). `cookie-policy.html` is conditional in the spec and in T5.
- Names checked across tasks: `push(subscriber, resubscribe=False)`, `remove(email)`, `members()`, `configured()`, `SIGNS`, `safely`, `clean_sign`, `subscribe_email(email, sun_sign='')`, `unsubscribe_email(email)`, `setNewsletter(subscribed, sunSign)`.
