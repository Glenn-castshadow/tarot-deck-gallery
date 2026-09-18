# Newsletter audience sync to Mailchimp

**Date:** 2026-09-18. **Status:** design approved in chat, awaiting Glenn's review of this spec.

## Purpose

The site has captured newsletter signups since 2026-09-09 (Django `newsletter` app, table
`newsletter_subscriber` on the VPS) but has never sent an email, never verified an address and
has no provider. This project connects that list to a Mailchimp audience so issues can be sent,
and records each subscriber's sun sign so an issue can carry a per-sign section.

This is piece 1 of 3. Piece 2 (a weekly per-sign reading written by Muse Glimmer) and piece 3
(a script that builds each issue and creates a draft Mailchimp campaign) get their own specs.
Nothing here sends a campaign.

## Decisions taken with Glenn

1. **Mailchimp is the delivery provider.** (Glenn, 2026-09-18.)
2. **The VPS database stays the source of truth**; Mailchimp is a pushed copy. The signup form,
   the account-panel toggle, the consent record and `unsubscribe.html` keep working as they do.
3. **One general edition plus per-sign segments**, not per-user AI issues. The segment key is
   the sun sign.
4. Weekly cadence, script-drafted campaigns that Glenn sends, and Glimmer-drafted editorial
   are decided but belong to pieces 2 and 3.
5. Everything below is Claude's recommendation, accepted with "yes, write the spec".

## Constraints

| Constraint | Source |
|---|---|
| Dependencies are open source | Glenn's global instructions |
| A Mailchimp failure never fails or delays a signup beyond the timeout | Claude's judgement |
| No birth details are stored with a subscriber; the sun sign is a value the subscriber picks | Existing `NEWSLETTER.md` rule ("No birth details"), extended by Claude to cover the new field |
| Subscriber data stays out of Git, Honcho and logs | Existing `NEWSLETTER.md` rule |
| Every future email carries a working unsubscribe link | Existing `NEWSLETTER.md` rule |
| The API key is put on the VPS by Glenn, never by Claude and never committed | Claude's operating rules |

## Architecture

Two paths keep Mailchimp in step, one fast and one thorough.

**Inline push.** When a subscriber is created, changes sign, or is removed, the view makes one
Mailchimp call with a 5 second timeout inside `try/except`. Any failure is logged without the
address and swallowed. This exists so the confirmation email goes out within seconds.

**Reconcile.** A management command, `sync_mailchimp`, run from `/etc/cron.d` every 10 minutes
(the same mechanism `deploy-app.sh` already uses for the backup), compares the whole database
with the whole audience and repairs any difference. It is the safety net for failed inline
pushes and the only path by which a Mailchimp-side unsubscribe reaches the VPS. There is no
webhook: it would be a new public endpoint to secure, and the reconcile already covers it
within ten minutes.

There is no sync-state column. The reconcile is a set diff, so it needs none.

## Components

### `newsletter/mailchimp.py` (new)

The only module that imports the Mailchimp SDK. Three functions:

- `push(subscriber)` — `PUT /lists/{id}/members/{md5(lowercase email)}` with
  `status_if_new: "pending"`, `merge_fields: {SIGN, SITEUNSUB}`. `SIGN` is the sun sign or an empty
  string. `SITEUNSUB` is the subscriber's VPS unsubscribe URL
  (`https://ishtarinsights.com/unsubscribe.html#<token>`), so piece 3's template can link it.
  It never sets `status`, so a member who unsubscribed in Mailchimp is not resubscribed by a push.
- `remove(email)` — `PATCH` the member to `status: "unsubscribed"`; a 404 is success.
- `members()` — iterate the audience (paged, `count=1000`) yielding `(email, status)`.

Each returns without doing anything when `MAILCHIMP_API_KEY` is empty, so development and the
test suite run offline. Configuration is three settings read from the environment:
`MAILCHIMP_API_KEY`, `MAILCHIMP_SERVER` (the `usNN` prefix) and `MAILCHIMP_AUDIENCE_ID`, added
to `ishtar-app.env.example` with empty values.

Library: `mailchimp-marketing`, Mailchimp's official Python SDK (Apache 2.0), pinned in
`requirements.txt`. The existing `django-anymail[resend]` stays for account email; Anymail
covers Mailchimp Transactional (Mandrill) but not the Marketing API used here.

### `Subscriber.sun_sign` (model change)

`CharField(max_length=11, blank=True, choices=<the twelve lowercase sign names>)`, one
migration. Blank means "general edition only".

### Public subscribe endpoint

`subscribe(data)` currently requires exactly `{email, consent, consentVersion}`. It will accept
an optional fourth key `sunSign`, which must be one of the twelve names or the request is a 400.
`subscribe_email(email, sun_sign='')` creates the row, or updates `sun_sign` on an existing row
when a non-blank sign is given, then calls `mailchimp.push`. Responses are unchanged, so a
duplicate signup still returns 200 and reveals nothing.

### Account toggle

`POST /api/account/newsletter/` accepts an optional `sunSign` beside `subscribed`, validated the
same way. Turning the toggle off deletes the row and calls `mailchimp.remove`. The server never
derives a sign from the stored birth profile: the client sends the value the member sees.

### Unsubscribe endpoint

Both branches (by email, by token) look the row up, delete it, and call `mailchimp.remove` with
the address. Responses are unchanged.

### `sync_mailchimp` management command

Loads the set of database emails and the audience's `(email, status)` pairs, then:

| Mailchimp | Database | Action |
|---|---|---|
| absent | present | `push` |
| `subscribed` or `pending` | absent | `remove` |
| `unsubscribed` or `cleaned` | present | delete the database row |
| `subscribed` or `pending` | present | nothing |

It prints counts only, never addresses. It exits non-zero on an API error so cron mail reports
it. `# ponytail: full diff each run, fine to a few thousand members; switch to
since_last_changed when a run takes more than a few seconds.`

One consequence to accept: a member who never clicks the confirmation email stays `pending` in
Mailchimp and present in the database indefinitely. Mailchimp does not send campaigns to
`pending` members, so this is harmless, and the account panel still shows the toggle as on.

### Signup form and account panel (front end)

- `index.html` gains an optional `<select id="newsletter-sign">` ("Your sign (optional)") in the
  newsletter fieldset. `newsletter.js` includes `sunSign` in the payload only when one is chosen.
- When the visitor has a birth profile, the select is preset from the same Sun sign the daily
  horoscope uses; the visitor can change or clear it.
- `account-core.js` `setNewsletter(subscribed, sunSign)` passes the sign through.
- The success message changes to say a confirmation email is on its way.
- The new control must not block the birth-chart submission, the same rule the email field
  already follows.

### Consent and privacy

- `NEWSLETTER_CONSENT_VERSION` becomes `2026-09-18-v2` and the consent text names the provider:
  "Yes, email me the Ishtar Insights newsletter and occasional updates about new readings and
  features. Emails are sent through Mailchimp." The constant in `newsletter.js` moves with it.
- `newsletter-privacy.html` states that the address, the chosen sign and the unsubscribe link
  are shared with Mailchimp (Intuit) for delivery, that Mailchimp sends a confirmation email,
  and that either unsubscribe route works. `cookie-policy.html` is checked and updated only if
  it describes newsletter data handling.
- Subscribers recorded under v1 agreed to text naming no provider. They are pushed as `pending`
  like everyone else, so Mailchimp's confirmation email is their fresh opt-in; anyone who
  ignores it is never mailed.

## Error handling

- Inline push or remove fails: signup or unsubscribe still succeeds; the reconcile repairs it.
- The inline call is bounded by the SDK timeout (5 s). Nginx already limits the endpoint to
  10 requests a minute per IP, which bounds how many workers a Mailchimp outage can hold.
- Reconcile fails midway: every action is idempotent, so the next run finishes the job.
- Mailchimp marks an address `cleaned` (hard bounce): the reconcile deletes the row, which
  also turns the member's account toggle off.

## Testing

Django tests in `newsletter/tests/`, with `newsletter.mailchimp` replaced by a recording fake:

1. Subscribe pushes once with the right sign; a duplicate signup with a new sign updates it.
2. Subscribe returns 200 and stores the row when `push` raises.
3. `sunSign` outside the twelve names is a 400; omitting it still works.
4. Unsubscribe by email and by token both call `remove` with the address.
5. The account toggle passes the sign on and calls `remove` when turned off.
6. `sync_mailchimp`: one test per row of the table above.
7. With no API key configured, the real module makes no network call.

`tests/newsletter-ui.test.cjs` gains cases for the optional select: payload omits `sunSign`
when blank, includes it when chosen, and the control never blocks the birth form. Each new test
is shown failing before its implementation, per the fix-round memory.

One manual check after deploy, with a real address Glenn controls: sign up, receive the
confirmation, confirm, see `subscribed` and the `SIGN` field in Mailchimp, unsubscribe on the
site, see `unsubscribed` in Mailchimp.

## What Glenn does by hand

1. Create the Mailchimp account and one audience; turn on double opt-in for the audience.
2. Add the merge fields `SIGN` (text) and `SITEUNSUB` (website).
3. Authenticate `ishtarinsights.com` as the sending domain (DKIM and DMARC records).
4. Put the API key, server prefix and audience ID in `/etc/ishtar-app.env` on the VPS.

## Out of scope

Campaign creation, templates, the weekly reading, editorial drafting, segments inside Mailchimp
(piece 3 builds them from `SIGN`), location or interest tags, a Mailchimp webhook, and any
change to the retired `server/newsletter.py`.
