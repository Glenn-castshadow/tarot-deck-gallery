# Site Foundation (C0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single-page site into a hub plus seven topic pages, share the birth profile and page shell across them, and make every room saveable to the account journal through one registry, with every existing feature behaving exactly as it does today.

**Architecture:** Three shippable milestones. Milestone 1 generalizes saving (server `kinds.py`, `summary`/`category` columns, `rooms.js` registry, journal filters) while the site is still one page. Milestone 2 extracts the shared pieces out of `app.js` (`birth-profile.js`, `birth-form.js`, `site-shell.js`, room modules) still on one page. Milestone 3 splits the page into `/tarot/`, `/sky/`, `/charts/`, `/eastern/`, `/numerology/`, `/divination/`, `/account/` and a hub, adds per-page metadata, sitemap, hash redirects and the nginx rule. Each milestone ends with the full test suite green and a deploy.

**Tech Stack:** Vanilla ES2020 browser JS in UMD-style globals with `?v=` cache keys and no build step; `node --test tests/*.test.cjs` (Node 24, run from Git Bash); Django 5 app under `server/ishtar` tested with `python manage.py test`; nginx static root at `/opt/tarot-game/current`.

**Spec:** `docs/superpowers/specs/2026-09-13-site-expansion-design.md` (Parts A and B, sub-project C0).

## Global Constraints

- No build step; plain `<script>` tags; bump `?v=` on every changed file. (Codebase convention.)
- Every existing section behaves identically on its new page; no visual redesign. (Spec C0.)
- Birth data stays in the browser or behind the existing account consent; nothing new is sent except an explicit Save. (Codebase convention.)
- Storage keys unchanged: `arcana-birthday-profile-v1` and the daily-card and deck keys stay as they are. (Codebase convention, spec Part A.)
- The `setBirthChart(chart)` contract each room implements is unchanged. (Spec Part A.)
- Payload cap 8 KB, per-user cap 500, `kind` widened to 32 characters, new columns `summary` (120) and `category`. (Spec Part B.)
- Categories are exactly `tarot`, `sky`, `charts`, `eastern`, `numerology`, `divination`. (Spec Part B.)
- Guests see "Sign in to save"; no guest local journal. (Glenn, 2026-09-13.)
- Keyboard operable, `aria-current="page"` on the active nav link, layouts verified at 390px and 1400px. (Codebase convention.)
- Open-source only; no new runtime dependency is needed for this plan. (Glenn's global preference.)
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Baseline before Task 1: run `node --test tests/*.test.cjs` and `cd server/ishtar && python manage.py test`; record both counts in the first commit message.

---

## File map

| File | Responsibility | Change |
|---|---|---|
| `server/ishtar/readings/kinds.py` | Single list of kinds with category and label | Create |
| `server/ishtar/readings/models.py`, `migrations/0003_reading_summary_category.py` | Columns and index | Modify / Create |
| `server/ishtar/readings/views.py`, `tests/test_readings.py` | Accept `summary`, derive `category`, filter | Modify |
| `rooms.js`, `tests/rooms.test.cjs` | Room registry, `?reading=` opener, page map | Create |
| `account-core.js`, `tests/account-core.test.cjs` | Filters on list, `summary` on save | Modify |
| `account.js` | Registry-driven save/open, filter chips | Modify |
| `app.js` | Register tarot room; later split | Modify, then shrink |
| `divination.js` | Register divination rooms | Modify |
| `birth-profile.js`, `tests/birth-profile.test.cjs` | Profile storage, resolution, subscribers | Create (from `app.js:240-420`) |
| `birth-form.js` | Birth form DOM wiring | Create (from `app.js:336-420`) |
| `natal-room.js` | Sky portrait and natal report view | Create (from `app.js:275-333`) |
| `chinese-room.js` | Chinese zodiac portrait view | Create (from `app.js:330`) |
| `tarot.js` | Reading room, deck chooser, card detail dialog | Create (from `app.js:1-90, 420-830`) |
| `deck-archive.js` | Gallery, search, deck detail | Create (from `app.js:110-200`) |
| `hub.js` | Today strip on the hub | Create |
| `site-shell.js`, `site-shell.css`, `tests/site-shell.test.cjs` | Masthead, nav, account button, footer, storage notice | Create |
| `mobile-sections.js` | Folds declared by `data-fold` attributes | Modify |
| `index.html` | Hub | Rewrite |
| `tarot/index.html`, `sky/index.html`, `charts/index.html`, `eastern/index.html`, `numerology/index.html`, `divination/index.html`, `account/index.html` | Topic pages | Create |
| `sitemap.xml`, `robots.txt` | Discoverability | Create |
| `server/nginx-ishtar-app.conf`, `server/deploy-app.sh` | `try_files` for directory pages | Modify |
| `docs/SITE-STRUCTURE.md`, every `docs/*.md` section path, `docs/deployment.md` | Docs | Create / Modify |

---

## Milestone 1: universal saving on the single page

### Task 1: Server kinds registry and columns

**Files:**
- Create: `server/ishtar/readings/kinds.py`
- Modify: `server/ishtar/readings/models.py`
- Create: `server/ishtar/readings/migrations/0003_reading_summary_category.py` (via `makemigrations`)
- Test: `server/ishtar/readings/tests/test_readings.py`

**Interfaces:**
- Produces: `KINDS: dict[str, tuple[str, str]]` mapping kind → `(label, category)`; `CATEGORIES: tuple[str, ...]`; `Reading.summary`, `Reading.category`.

- [ ] **Step 1: Write the failing tests**

Append to `server/ishtar/readings/tests/test_readings.py`:

```python
from readings.kinds import KINDS, CATEGORIES

class KindsTests(TestCase):
    def test_every_kind_has_a_known_category(self):
        for kind, (label, category) in KINDS.items():
            self.assertIn(category, CATEGORIES, kind)
            self.assertTrue(label)
            self.assertLessEqual(len(kind), 32)

    def test_existing_kinds_are_still_present(self):
        for kind in ('tarot-daily', 'tarot-spread', 'lenormand', 'oracle', 'runes', 'geomancy', 'iching'):
            self.assertIn(kind, KINDS)

class SummaryCategoryTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user('reader@example.com')
        self.client.force_login(self.user)

    def test_summary_is_stored_and_category_derived(self):
        body = dict(SPREAD, summary='Celtic Cross · What next?')
        row = self.client.post('/api/readings/', body, content_type='application/json').json()
        self.assertEqual(row['summary'], 'Celtic Cross · What next?')
        self.assertEqual(row['category'], 'tarot')
        listed = self.client.get('/api/readings/').json()['readings'][0]
        self.assertEqual(listed['summary'], 'Celtic Cross · What next?')

    def test_summary_too_long_is_rejected(self):
        body = dict(SPREAD, summary='x' * 121)
        self.assertEqual(self.client.post('/api/readings/', body, content_type='application/json').status_code, 400)

    def test_category_filter(self):
        self.client.post('/api/readings/', SPREAD, content_type='application/json')
        self.client.post('/api/readings/', {'kind': 'runes', 'payload': {'ids': [1]}}, content_type='application/json')
        self.assertEqual(self.client.get('/api/readings/?category=divination').json()['count'], 1)
        self.assertEqual(self.client.get('/api/readings/?kind=tarot-spread').json()['count'], 1)
        self.assertEqual(self.client.get('/api/readings/?category=nope').status_code, 400)
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server/ishtar && python manage.py test readings`
Expected: FAIL with `ModuleNotFoundError: readings.kinds`.

- [ ] **Step 3: Create `kinds.py`**

```python
"""Every reading kind the journal accepts. Rooms in the browser register the same kinds
(rooms.js); a kind unknown here is rejected by the API. Add a kind here first."""

CATEGORIES = ('tarot', 'sky', 'charts', 'eastern', 'numerology', 'divination')

KINDS = {
    'tarot-daily': ('Daily card', 'tarot'),
    'tarot-spread': ('Tarot spread', 'tarot'),
    'lenormand': ('Lenormand', 'divination'),
    'oracle': ('Ishtar Reflection Oracle', 'divination'),
    'runes': ('Runes', 'divination'),
    'geomancy': ('Geomancy', 'divination'),
    'iching': ('I Ching', 'divination'),
    'natal': ('Birth chart', 'charts'),
    'solar-return': ('Solar return', 'charts'),
    'lunar-return': ('Lunar return', 'charts'),
    'progressed': ('Progressed chart', 'charts'),
    'synastry': ('Synastry', 'charts'),
    'horary': ('Horary chart', 'charts'),
    'jyotish': ('Jyotish chart', 'eastern'),
    'bazi': ('Four Pillars', 'eastern'),
    'numerology': ('Numerology', 'numerology'),
}

CHOICES = [(kind, label) for kind, (label, _category) in KINDS.items()]
```

Kinds for later sub-projects (`tarot-yesno`, `composite`, `chinese-year`, `transit-calendar`, `cartomancy`, `grand-tableau`, `geomancy-houses`) are added by those plans, not here.

- [ ] **Step 4: Update the model**

In `models.py` replace the `KINDS` list and the `kind` field, and add the two columns:

```python
from .kinds import CATEGORIES, CHOICES

class Reading(models.Model):
    KINDS = CHOICES
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='readings')
    kind = models.CharField(max_length=32, choices=CHOICES)
    category = models.CharField(max_length=12, choices=[(c, c) for c in CATEGORIES], default='tarot')
    summary = models.CharField(max_length=120, blank=True)
    ...  # deck, layout, question, focus, payload, note, created_at unchanged

    class Meta:
        ordering = ['-created_at', '-id']
        indexes = [models.Index(fields=['user', '-created_at']), models.Index(fields=['user', 'category', '-created_at'])]
```

Run `python manage.py makemigrations readings -n reading_summary_category`. Then edit the generated migration to backfill `category` for existing rows with a `RunPython` step:

```python
def backfill(apps, schema_editor):
    Reading = apps.get_model('readings', 'Reading')
    Reading.objects.filter(kind__startswith='tarot').update(category='tarot')
    Reading.objects.exclude(kind__startswith='tarot').update(category='divination')
```

Add `migrations.RunPython(backfill, migrations.RunPython.noop)` after the field operations.

- [ ] **Step 5: Update the view**

In `views.py`:

```python
from .kinds import CATEGORIES, KINDS
CREATE_KEYS = {'kind', 'deck', 'layout', 'question', 'focus', 'payload', 'summary'}
```

In `serialize`, add `'summary': reading.summary, 'category': reading.category`. In `collection` GET, before paginating:

```python
    queryset = Reading.objects.filter(user=request.user)
    category = request.GET.get('category')
    kind = request.GET.get('kind')
    if category is not None:
        if category not in CATEGORIES:
            return error('Unknown category.')
        queryset = queryset.filter(category=category)
    if kind is not None:
        if kind not in KINDS:
            return error('Unknown reading kind.')
        queryset = queryset.filter(kind=kind)
    paginator = Paginator(queryset, PAGE_SIZE)
```

In `collection` POST, replace `body['kind'] not in KINDS` with the dict lookup, add `'summary': text(body.get('summary'), 120, 'Summary')` to `fields`, and pass `category=KINDS[body['kind']][1]` to `Reading.objects.create`.

- [ ] **Step 6: Run tests**

Run: `cd server/ishtar && python manage.py test readings`
Expected: PASS, including the four existing tests.

- [ ] **Step 7: Commit**

```bash
git add server/ishtar/readings
git commit -m "feat(readings): kinds registry, summary and category columns, journal filters"
```

### Task 2: `rooms.js` registry

**Files:**
- Create: `rooms.js`
- Test: `tests/rooms.test.cjs`

**Interfaces:**
- Produces (global `Rooms`, also `module.exports` for Node):
  - `Rooms.register(kind, {label, category, page, current, load})` — `current(): {kind, deck, layout, question, focus, summary, payload} | null`; `load(reading): boolean`.
  - `Rooms.get(kind)`, `Rooms.list()`, `Rooms.pageFor(kind)` → `/tarot/` etc. from the static `PAGES` map, independent of registration.
  - `Rooms.openFromQuery({search, getReading, scrollTo})` — reads `reading=ID` from `search`, fetches, dispatches to the registered room, returns `'opened' | 'unknown' | 'failed' | 'none'`.

- [ ] **Step 1: Write the failing test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const Rooms = require('../rooms.js');

test('register and current round-trip', () => {
  Rooms._reset();
  Rooms.register('runes', {label: 'Runes', category: 'divination', current: () => ({kind: 'runes', payload: {ids: [1]}}), load: () => true});
  assert.equal(Rooms.get('runes').label, 'Runes');
  assert.deepEqual(Rooms.list().map(r => r.kind), ['runes']);
  assert.equal(Rooms.pageFor('runes'), '/divination/');
  assert.equal(Rooms.pageFor('natal'), '/charts/');
  assert.equal(Rooms.pageFor('made-up'), null);
});

test('register rejects unknown category and duplicate kind', () => {
  Rooms._reset();
  assert.throws(() => Rooms.register('x', {label: 'X', category: 'nope', current: () => null, load: () => false}));
  Rooms.register('runes', {label: 'Runes', category: 'divination', current: () => null, load: () => false});
  assert.throws(() => Rooms.register('runes', {label: 'Runes', category: 'divination', current: () => null, load: () => false}));
});

test('openFromQuery dispatches to the room', async () => {
  Rooms._reset();
  let loaded = null;
  Rooms.register('runes', {label: 'Runes', category: 'divination', current: () => null, load: r => { loaded = r; return true; }});
  const getReading = async id => ({ok: true, reading: {id, kind: 'runes', payload: {ids: [3]}}});
  assert.equal(await Rooms.openFromQuery({search: '?reading=7', getReading, scrollTo: () => {}}), 'opened');
  assert.deepEqual(loaded.payload, {ids: [3]});
  assert.equal(await Rooms.openFromQuery({search: '', getReading, scrollTo: () => {}}), 'none');
  assert.equal(await Rooms.openFromQuery({search: '?reading=abc', getReading, scrollTo: () => {}}), 'none');
  const unknown = async id => ({ok: true, reading: {id, kind: 'natal', payload: {}}});
  assert.equal(await Rooms.openFromQuery({search: '?reading=1', getReading: unknown, scrollTo: () => {}}), 'unknown');
  const failing = async () => ({ok: false, message: 'no'});
  assert.equal(await Rooms.openFromQuery({search: '?reading=1', getReading: failing, scrollTo: () => {}}), 'failed');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/rooms.test.cjs`
Expected: FAIL, cannot find module `../rooms.js`.

- [ ] **Step 3: Implement**

```js
/* Room registry: every saveable room registers its kind here. account.js saves through
   current() and opens through load(); rooms.js also knows which page owns each kind. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Rooms = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const CATEGORIES = ['tarot', 'sky', 'charts', 'eastern', 'numerology', 'divination'];
  // Mirrors server/ishtar/readings/kinds.py. Kinds added by later sub-projects join both lists.
  const PAGES = {
    'tarot-daily': '/tarot/', 'tarot-spread': '/tarot/',
    lenormand: '/divination/', oracle: '/divination/', runes: '/divination/', geomancy: '/divination/', iching: '/divination/',
    natal: '/charts/', 'solar-return': '/charts/', 'lunar-return': '/charts/', progressed: '/charts/', synastry: '/charts/', horary: '/charts/',
    jyotish: '/eastern/', bazi: '/eastern/',
    numerology: '/numerology/'
  };
  let rooms = new Map();
  function register(kind, room) {
    if (!CATEGORIES.includes(room.category)) throw new Error(`Unknown category for ${kind}`);
    if (rooms.has(kind)) throw new Error(`Room already registered: ${kind}`);
    if (typeof room.current !== 'function' || typeof room.load !== 'function') throw new Error(`Room ${kind} needs current() and load()`);
    rooms.set(kind, {kind, ...room});
  }
  async function openFromQuery({search, getReading, scrollTo}) {
    const id = Number(new URLSearchParams(search).get('reading'));
    if (!Number.isInteger(id) || id <= 0) return 'none';
    const result = await getReading(id);
    if (!result.ok) return 'failed';
    const room = rooms.get(result.reading.kind);
    if (!room) return 'unknown';
    if (!room.load(result.reading)) return 'failed';
    scrollTo(room);
    return 'opened';
  }
  return {
    CATEGORIES, register, openFromQuery,
    get: kind => rooms.get(kind) || null,
    list: () => Array.from(rooms.values()),
    pageFor: kind => PAGES[kind] || null,
    _reset: () => { rooms = new Map(); }
  };
});
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/rooms.test.cjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add rooms.js tests/rooms.test.cjs
git commit -m "feat: rooms registry for saveable readings"
```

### Task 3: Rooms register themselves; `account.js` goes generic

**Files:**
- Modify: `account-core.js:77-88`, `tests/account-core.test.cjs`
- Modify: `account.js:13, 148-170`
- Modify: `app.js:804-830` (TarotRoom), `app.js:656` (save button)
- Modify: `divination.js:90-101`
- Modify: `index.html` (script tag for `rooms.js` before `account-core.js`; journal filter markup)

**Interfaces:**
- Consumes: `Rooms` from Task 2; `summary` from Task 1.
- Produces: `account.listReadings(page, {category, kind})`; rooms return `summary` from `current()`.

- [ ] **Step 1: Extend the account-core test**

Add to `tests/account-core.test.cjs`, following the file's existing fake-fetch helper pattern (read the top of that file for `createAccount` setup):

```js
test('listReadings passes category and kind filters', async () => {
  const calls = [];
  const account = createAccountWithFetch(async (url) => { calls.push(url); return jsonResponse(200, {readings: [], page: 1, pages: 1, count: 0}); });
  await account.listReadings(2, {category: 'tarot', kind: 'tarot-daily'});
  assert.equal(calls[0], '/api/readings/?page=2&category=tarot&kind=tarot-daily');
  await account.listReadings(1, {});
  assert.equal(calls[1], '/api/readings/?page=1');
});
```

Run: `node --test tests/account-core.test.cjs` → FAIL (URL lacks filters).

- [ ] **Step 2: Implement in `account-core.js`**

```js
    async function listReadings(page = 1, filters = {}) {
      const params = new URLSearchParams({page: String(page)});
      if (filters.category) params.set('category', filters.category);
      if (filters.kind) params.set('kind', filters.kind);
      const {status, data} = await call('GET', `${API}/readings/?${params}`);
      return status === 200 ? data : {readings: [], page, pages: 1, count: 0, error: firstError(data, 'Could not load your journal.')};
    }
```

Run the test → PASS.

- [ ] **Step 3: Register the tarot room**

In `app.js`, after `window.TarotRoom = {...}` (line ~830) add:

```js
for (const kind of ["tarot-daily", "tarot-spread"]) Rooms.register(kind, {
  label: kind === "tarot-daily" ? "Daily card" : "Tarot spread", category: "tarot",
  current: () => { const draw = window.TarotRoom.currentDraw(); return draw && draw.kind === kind ? draw : null; },
  load: reading => window.TarotRoom.loadDraw(reading)
});
```

Add `summary` to both objects `currentDraw()` returns: daily → `` `${card.name} · ${orientation}` ``; spread → `` `${spreadName} · ${question || "no question"}`.slice(0, 120) `` using the spread's display name from `TarotReadings.layouts`.

- [ ] **Step 4: Register the divination rooms**

In `divination.js`, after `window.DivinationRoom = {...}`:

```js
  const labels = {lenormand: 'Lenormand', oracle: 'Reflection oracle', runes: 'Runes', geomancy: 'Geomancy', iching: 'I Ching'};
  for (const kind of Object.keys(labels)) Rooms.register(kind, {
    label: labels[kind], category: 'divination',
    current: () => { const draw = window.DivinationRoom.currentDraw(); return draw && draw.kind === kind ? draw : null; },
    load: reading => window.DivinationRoom.loadDraw(reading)
  });
```

In `currentDraw()` add `summary`: Lenormand/oracle/runes → the drawn symbols' names joined by " · "; geomancy → the judge figure's name; I Ching → `Hexagram N · name`. Cut to 120 characters.

- [ ] **Step 5: Make `account.js` generic**

Replace `kindLabel` with `const kindLabel = kind => Rooms.get(kind)?.label || kind;` and update its two uses. Replace the save handler's room lookup:

```js
    const kind = trigger.dataset.saveReading;
    const room = Rooms.get(kind);
    const draw = room?.current();
```

Change the save buttons in `app.js:656` and `divination.js:91` to emit `data-save-reading="${kind}"` with the actual kind (`tarot-daily`/`tarot-spread`, or the divination mode). Replace the open handler:

```js
      const room = Rooms.get(reading.kind);
      if (room) { status.textContent = room.load(reading) ? '' : 'This reading cannot be replayed in the current page version.'; return; }
      const page = Rooms.pageFor(reading.kind);
      if (page) { location.href = `${page}?reading=${id}`; return; }
      status.textContent = 'This reading cannot be replayed in the current page version.';
```

Guest state: where `saveControl()` in `divination.js` and the tarot save markup check `signedIn`, render the button regardless with `data-save-reading` and, when signed out, text "Sign in to save this reading"; in the `account.js` save handler, if `!account.state().signedIn` call `openSignIn(trigger)` and return.

- [ ] **Step 6: Journal filters**

In `index.html` before `#journal-list` add:

```html
<div class="journal-filters" role="group" aria-label="Filter saved readings">
  <button type="button" data-journal-category="" aria-pressed="true">All</button>
  <button type="button" data-journal-category="tarot" aria-pressed="false">Tarot</button>
  <button type="button" data-journal-category="charts" aria-pressed="false">Charts</button>
  <button type="button" data-journal-category="eastern" aria-pressed="false">Eastern</button>
  <button type="button" data-journal-category="numerology" aria-pressed="false">Numerology</button>
  <button type="button" data-journal-category="divination" aria-pressed="false">Divination</button>
  <label>Find <input type="search" id="journal-search" placeholder="question or summary"></label>
</div>
```

In `account.js` keep `let journalCategory = ''` and pass `{category: journalCategory}` to `listReadings`; filter the rendered rows client-side by `#journal-search` against `question` and `summary` (the page holds at most 50 rows). Render `summary` under the kind label. Add the chip styles to `account.css` next to `.journal-pager`.

- [ ] **Step 7: Verify**

Run: `node --test tests/*.test.cjs` → all pass. Open the site with `preview_start`, sign in, save a daily card, a spread and a rune draw, filter by Tarot, search a question, open each; confirm a guest sees "Sign in to save" and clicking it opens the sign-in dialog.

- [ ] **Step 8: Commit and deploy milestone 1**

```bash
git add rooms.js account-core.js account.js account.css app.js divination.js index.html tests
git commit -m "feat(journal): registry-driven saving with summaries and category filters"
```

Deploy backend (migration) then frontend with the existing release procedure; record in `docs/deployment.md`.

---

## Milestone 2: shared modules on the single page

### Task 4: `birth-profile.js`

**Files:**
- Create: `birth-profile.js`
- Test: `tests/birth-profile.test.cjs`
- Modify: `app.js:240-420` (delete the moved code), `account.js:194` (`BirthRoom.restore` → `BirthProfile.restore`)

**Interfaces:**
- Produces global `BirthProfile` (UMD):
  - `BirthProfile.create({storage, natalEngine, key})` for tests; the browser file calls it once with `IshtarStorage` and `NatalEngine` and exposes the instance.
  - `load(): profile | null` — reads and parses the stored profile.
  - `save(profile)` — writes storage, resolves, notifies.
  - `restore()` — reload from storage and notify (used after account sync).
  - `current(): {profile, natal} | null`.
  - `subscribe(fn)` — `fn({profile, natal})` immediately with the current state and on every change; returns unsubscribe.
  - `setReturnLocation(location)` — the `persistReturnLocation` behavior from `app.js:387-395`.

- [ ] **Step 1: Write the failing test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const BirthProfile = require('../birth-profile.js');

function memoryStorage() { const m = new Map(); return {getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k)}; }
const fakeEngine = {calculate: input => ({status: input.time ? 'ready' : 'birthday-only', input})};

test('save stores, resolves and notifies subscribers', () => {
  const bp = BirthProfile.create({storage: memoryStorage(), natalEngine: fakeEngine, key: 'k'});
  const seen = [];
  bp.subscribe(state => seen.push(state));
  assert.equal(seen[0], null);
  bp.save({birthday: '1980-10-22', time: '08:00', place: 'Lisbon', placeLocation: {latitude: 38.7, longitude: -9.1, timeZone: 'Europe/Lisbon'}});
  assert.equal(seen[1].natal.status, 'ready');
  assert.equal(bp.load().birthday, '1980-10-22');
});

test('restore reads storage and a corrupt value yields null', () => {
  const storage = memoryStorage();
  storage.setItem('k', '{not json');
  const bp = BirthProfile.create({storage, natalEngine: fakeEngine, key: 'k'});
  assert.equal(bp.current(), null);
  storage.setItem('k', JSON.stringify({birthday: '1990-01-01'}));
  bp.restore();
  assert.equal(bp.current().natal.status, 'birthday-only');
});

test('setReturnLocation updates the stored profile only when one exists', () => {
  const storage = memoryStorage();
  const bp = BirthProfile.create({storage, natalEngine: fakeEngine, key: 'k'});
  bp.setReturnLocation({label: 'Rome'});
  assert.equal(storage.getItem('k'), null);
  bp.save({birthday: '1990-01-01'});
  bp.setReturnLocation({label: 'Rome'});
  assert.equal(JSON.parse(storage.getItem('k')).returnLocation.label, 'Rome');
});
```

Run: `node --test tests/birth-profile.test.cjs` → FAIL (module missing).

- [ ] **Step 2: Implement**

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BirthProfile = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  function create({storage, natalEngine, key = 'arcana-birthday-profile-v1'}) {
    const subscribers = new Set();
    let state = null;
    function load() { try { const p = JSON.parse(storage.getItem(key)); return p?.birthday ? p : null; } catch { return null; } }
    function resolve(profile) {
      if (!profile) return null;
      const natal = natalEngine.calculate({birthday: profile.birthday, time: profile.time || '', location: profile.placeLocation, houseSystem: profile.houseSystem || 'placidus', fold: profile.fold || '', orbScale: Number(profile.orbScale) || 1});
      return {profile, natal};
    }
    function notify() { for (const fn of subscribers) fn(state); }
    function restore() { state = resolve(load()); notify(); }
    function save(profile) { try { storage.setItem(key, JSON.stringify(profile)); } catch {} state = resolve(profile); notify(); }
    function setReturnLocation(location) {
      const saved = load(); if (!saved) return;
      saved.returnLocation = location;
      try { storage.setItem(key, JSON.stringify(saved)); } catch {}
      if (state) state.profile.returnLocation = location;
    }
    function subscribe(fn) { subscribers.add(fn); fn(state); return () => subscribers.delete(fn); }
    restore();
    return {load, save, restore, current: () => state, subscribe, setReturnLocation};
  }
  return {create};
});
```

The browser bootstrap at the end of the file (guarded by `typeof window !== 'undefined' && window.IshtarStorage && window.NatalEngine`) sets `window.BirthProfile = Object.assign(BirthProfile, BirthProfile.create({storage: IshtarStorage, natalEngine: NatalEngine}))`. Note `NatalEngine.calculate` is called exactly as `app.js:290` does today; copy the argument list verbatim from that line, including `orbScale`.

Run the test → PASS.

- [ ] **Step 3: Rewire `app.js`**

Replace the five `setBirthChart` fan-outs in `renderBirthdayProfile` with subscriptions placed right after each `attach`:

```js
BirthProfile.subscribe(state => { worldAtlas.setBirthChart(state?.natal || null); });
BirthProfile.subscribe(state => { celestialExtras.setBirthChart(state?.natal || null); });
BirthProfile.subscribe(state => { chartInTime.setBirthChart(state?.natal || null); });
BirthProfile.subscribe(state => { jyotish.setBirthChart(state?.natal || null); });
BirthProfile.subscribe(state => { horary.setBirthChart(state?.natal || null); });
BirthProfile.subscribe(state => { dailyHoroscope.setProfileSign(state?.natal?.status === 'ready' ? zodiacSigns[state.natal.points[0].index] : state ? zodiacFor(birthdayParts(state.profile.birthday)) : null); });
```

`renderBirthdayProfile(saved)` keeps only the rendering of `#birthday-output` and takes `state` from `BirthProfile.current()`. The submit handler becomes `BirthProfile.save(currentBirthProfile())`; `persistReturnLocation` becomes `BirthProfile.setReturnLocation(chartInTime.getReturnLocation())`; `restoreBirthdayProfile` keeps only the form-field population and then calls `BirthProfile.restore()`. Replace `window.BirthRoom = {restore: ...}` with `window.BirthRoom = {restore: restoreBirthdayProfile, currentProfile: currentBirthProfile}` unchanged in name so `account.js:194` keeps working.

- [ ] **Step 4: Verify and commit**

Run: `node --test tests/*.test.cjs` → pass. Browser: enter birth details, confirm the natal report, astrocartography, transits, chart in time, Jyotish, horary and the daily horoscope sign all update; reload and confirm restore; sign in and confirm the account profile sync still repopulates.

```bash
git add birth-profile.js tests/birth-profile.test.cjs app.js account.js index.html
git commit -m "refactor: shared BirthProfile with subscribers replaces setBirthChart fan-out"
```

### Task 5: `birth-form.js`, `natal-room.js`, `chinese-room.js`, `tarot.js`, `deck-archive.js`

**Files:**
- Create: `birth-form.js` (from `app.js:246-250, 336-420` minus what Task 4 moved), `natal-room.js` (from `app.js:240-333` sky portrait, natal report, print handlers, `setBirthdayView`), `chinese-room.js` (the `BirthdayInsights.renderChinese` block and its time handling), `tarot.js` (`app.js:1-90` card data and `app.js:420-830` reading room, card detail dialog and Rooms registration), `deck-archive.js` (`app.js:110-200` gallery, search, empty state, deck detail)
- Modify: `index.html` script tags; delete `app.js` when empty
- Test: existing `tests/tarot-readings.test.cjs` and `tests/birthday-insights.test.cjs` must still pass; no new unit test because these modules are DOM wiring, verified in the browser.

**Interfaces:**
- `BirthForm.attach(form, {picker})` — owns inputs, validity, manual coordinates, fold field, submit → `BirthProfile.save`. Exposes `restore(profile)` and `currentProfile()`.
- `NatalRoom.attach(root)` — subscribes to `BirthProfile`, renders sky portrait and natal report, opens `SkyChart`.
- `ChineseRoom.attach(root)` — subscribes, renders the Chinese portrait.
- `Numerology.attach` is unchanged; `numerology.js` gains its own `BirthProfile.subscribe` that re-attaches with preserved state exactly as `renderBirthdayProfile` does today (`getState()` → `destroy()` → `attach(root, parts, state)`).
- `window.TarotRoom` and `window.BirthRoom` keep their names and shapes.

- [ ] **Step 1: Move code file by file**

Move in this order, running `node --test tests/*.test.cjs` and reloading the page after each: `deck-archive.js`, `tarot.js`, `chinese-room.js`, `natal-room.js`, `birth-form.js`. Each new file is an IIFE that reads its root with `document.querySelector` exactly as `app.js` does now; keep the DOM ids unchanged. The `#birthday-output` container today holds three views switched by `setBirthdayView`; keep that switcher in `natal-room.js` for milestone 2 (it is removed in Task 8 when the views move to separate pages).

- [ ] **Step 2: Script order in `index.html`**

```html
<script src="rooms.js?v=1"></script>
<script src="storage-preferences.js?v=birth-saving-1"></script>
<script src="account-core.js?v=foundation-1"></script>
<script src="account.js?v=foundation-1"></script>
<script src="newsletter.js?v=2"></script>
<script src="vendor/astronomy-engine/astronomy.browser.min.js?v=2.1.19"></script>
<script src="natal-engine.js?v=horary-1"></script>
<script src="birth-profile.js?v=1"></script>
<script src="birthday-insights.js?v=celestial-atlas-1"></script>
<script src="birthplace-search.js?v=atlas-2"></script>
<script src="birth-form.js?v=1"></script>
<script src="natal-chart.js?v=celestial-atlas-1"></script>
<script src="sky-chart.js?v=celestial-atlas-1"></script>
<script src="natal-room.js?v=1"></script>
<script src="chinese-room.js?v=1"></script>
... existing section scripts unchanged ...
<script src="archive-decks.js?v=archive-32"></script>
<script src="deck-archive.js?v=1"></script>
<script src="tarot-readings.js?v=accounts-3"></script>
<script src="tarot.js?v=1"></script>
<script src="mobile-sections.js?v=foundation-1"></script>
```

- [ ] **Step 3: Delete `app.js` and commit**

When `app.js` is empty, delete it and its script tag. Browser check the whole page at 1400px and 390px: every section, the deck gallery search and detail dialog, the daily card, a spread, birth form submit and restore, mobile folds.

```bash
git add -A
git commit -m "refactor: split app.js into birth-form, natal-room, chinese-room, tarot and deck-archive modules"
```

### Task 6: `site-shell.js` and `data-fold` mobile sections

**Files:**
- Create: `site-shell.js`, `site-shell.css`
- Test: `tests/site-shell.test.cjs`
- Modify: `index.html:26-56, 203-206, 234-240` (replace masthead nav, footer and storage notice with mount points), `mobile-sections.js:128-142`
- Modify: `styles.css` (move masthead, nav, footer, storage-notice rules into `site-shell.css`)

**Interfaces:**
- `SiteShell.render({page, variant})` → `{header, nav, footer, notice}` HTML strings (pure, tested in Node). `page` is one of `hub|tarot|sky|charts|eastern|numerology|divination|account`; `variant` is `hero` (hub) or `compact`.
- `SiteShell.mount(page)` in the browser writes into `[data-shell="header"]`, `[data-shell="nav"]`, `[data-shell="footer"]`, `[data-shell="notice"]`.
- `SiteShell.NAV` — the eight `{key, href, label, blurb}` entries, used by the hub's category cards too.

- [ ] **Step 1: Write the failing test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const SiteShell = require('../site-shell.js');

test('nav renders eight links with the current page marked', () => {
  const {nav} = SiteShell.render({page: 'charts', variant: 'compact'});
  assert.equal((nav.match(/<a /g) || []).length, 8);
  assert.match(nav, /href="\/charts\/" aria-current="page"/);
  assert.doesNotMatch(nav, /href="\/tarot\/" aria-current/);
});

test('hero variant only on the hub', () => {
  assert.match(SiteShell.render({page: 'hub', variant: 'hero'}).header, /class="masthead masthead--hero"/);
  assert.match(SiteShell.render({page: 'tarot', variant: 'compact'}).header, /class="masthead masthead--compact"/);
  assert.match(SiteShell.render({page: 'tarot', variant: 'compact'}).header, /id="account-button"/);
});

test('notice and footer carry the storage controls', () => {
  const {notice, footer} = SiteShell.render({page: 'tarot', variant: 'compact'});
  assert.match(notice, /data-storage-choice="allow"/);
  assert.match(footer, /data-storage-settings/);
  assert.match(footer, /href="\/cookie-policy.html"/);
});
```

Run → FAIL.

- [ ] **Step 2: Implement**

`site-shell.js` is UMD like `rooms.js`. `NAV` holds the eight entries in the spec's table order with the blurbs from the spec's "Contents" column shortened to one clause each. `render` builds: the masthead from `index.html:28-40` (hero variant verbatim; compact variant is the account bar, the logo at 160px wide and the `h1` replaced by the page title), the nav from `NAV` with `aria-current="page"` on the match, the footer from `index.html:203-206` with root-absolute hrefs, and the storage notice from `index.html:234-240` verbatim. `mount(page)` sets `innerHTML` of the four mount points and returns nothing. Move the CSS rules for `.masthead`, `.brand-lockup`, `.eyebrow`, `.hero-*`, `.section-nav`, `.footer`, `.storage-notice`, `.account-bar`, `.account-button` from `styles.css` to `site-shell.css` unchanged, and add `.masthead--compact` rules (logo 160px, title as `h1` at the `.lede` size).

- [ ] **Step 3: Mount points in `index.html`**

Replace lines 28-55 with `<div data-shell="header"></div><div data-shell="nav"></div>`, lines 203-206 with `<div data-shell="footer"></div>`, lines 234-240 with `<div data-shell="notice"></div>`, add `<link rel="stylesheet" href="site-shell.css?v=1">` after `styles.css`, and add `<script src="site-shell.js?v=1"></script><script>SiteShell.mount('hub')</script>` as the first scripts so `account.js` and `storage-preferences.js` find `#account-button`, `#storage-notice` and `[data-storage-settings]` when they run. Nav links stay `#fragment` links on this milestone (override `href` with `NAV[i].hash` when `page === 'hub'` and the site is still single-page; Task 8 removes this).

- [ ] **Step 4: `data-fold` in `mobile-sections.js`**

Replace the hardcoded `wrap(...)` calls at lines 130-142 with:

```js
    for (const el of document.querySelectorAll('[data-fold]')) {
      const members = el.dataset.foldMembers ? Array.from(document.querySelectorAll(el.dataset.foldMembers)) : [el];
      wrap(members, el.dataset.fold, {key: el.dataset.foldKey, group: el.dataset.foldGroup || 'main', level: Number(el.dataset.foldLevel || 2), subtitle: el.dataset.foldSubtitle || '', open: el.hasAttribute('data-fold-open')});
    }
```

and put the equivalent attributes on each section in `index.html`, for example `<section id="jyotish" class="jyotish" data-fold="Jyotish" data-fold-key="jyotish" data-fold-subtitle="Sidereal chart · nakshatras · dashas">`. The tarot fold that today wraps "children before `#birthday-room`" becomes a wrapper `<div data-fold="Tarot readings" data-fold-key="tarot" ...>` around those elements; the archive fold uses `data-fold-members="#archive,.gallery-head,#gallery,#empty-state"` on `#archive`. The birth form keeps `data-fold-level="4"` and `data-fold-open` when the birthday input is empty (set by `birth-form.js` before `MobileSections` runs).

- [ ] **Step 5: Verify and commit**

Run tests; browser at 390px: every fold opens and closes, the Sections button returns, the birth form opens for a first-time visitor; at 1400px the hero and nav are pixel-identical to before (compare screenshots).

```bash
git add site-shell.js site-shell.css tests/site-shell.test.cjs index.html styles.css mobile-sections.js
git commit -m "feat: site shell renders masthead, nav, footer and storage notice; folds declared in markup"
```

Deploy milestone 2 and record it.

---

## Milestone 3: pages

### Task 7: Page skeleton and asset paths

**Files:**
- Create: `tarot/index.html`, `sky/index.html`, `charts/index.html`, `eastern/index.html`, `numerology/index.html`, `divination/index.html`, `account/index.html`
- Modify: every stylesheet `url(...)` and every `src`/`href` in scripts that reference `assets/`, `tarot-decks/`, `vendor/` — make them root-absolute (`/assets/...`)

**Interfaces:**
- Every page has the same `<head>` block pattern and the four shell mount points; page-specific content sits between nav and footer.

- [ ] **Step 1: Root-absolute paths**

Run `rg -n "(src|href|url)\(?=?['\"(]?(assets|tarot-decks|vendor)/" --glob '*.js' --glob '*.css' --glob '*.html'` and prefix each with `/`. `archive-decks.js` builds deck image paths from `catalog.csv` values; prefix in the one place they are joined. Reload the hub and confirm every image and the astronomy library still load (Network tab, no 404).

- [ ] **Step 2: Page template**

Each page file:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#20152b">
  <title>Tarot readings · Ishtar Insights</title>
  <meta name="description" content="A daily card, full spreads in four illustrated decks, and an archive of thirty-two historical and modern tarot decks.">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Tarot readings · Ishtar Insights">
  <meta property="og:description" content="A daily card, full spreads in four illustrated decks, and an archive of thirty-two historical and modern tarot decks.">
  <meta property="og:image" content="https://ishtarinsights.com/assets/celestial-hero.webp">
  <meta property="og:url" content="https://ishtarinsights.com/tarot/">
  <link rel="canonical" href="https://ishtarinsights.com/tarot/">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="/styles.css?v=foundation-1">
  <link rel="stylesheet" href="/site-shell.css?v=1">
  <!-- page stylesheets -->
</head>
<body>
  <div class="grain" aria-hidden="true"></div>
  <main class="shell">
    <div data-shell="header"></div>
    <div data-shell="nav"></div>
    <!-- page sections -->
    <div data-shell="footer"></div>
  </main>
  <!-- page dialogs -->
  <div data-shell="notice"></div>
  <script src="/site-shell.js?v=1"></script>
  <script>SiteShell.mount('tarot')</script>
  <script src="/rooms.js?v=1"></script>
  <script src="/storage-preferences.js?v=birth-saving-1"></script>
  <script src="/account-core.js?v=foundation-1"></script>
  <script src="/account.js?v=foundation-1"></script>
  <!-- page scripts -->
  <script src="/mobile-sections.js?v=foundation-1"></script>
</body>
</html>
```

Titles and descriptions per page:

| Page | Title | Description |
|---|---|---|
| tarot | Tarot readings | A daily card, full spreads in four illustrated decks, and an archive of thirty-two historical and modern tarot decks. |
| sky | Today's sky | Daily horoscopes for every sign from the calculated tropical sky. |
| charts | Birth chart and celestial atlas | A calculated natal chart, solar and lunar returns, progressions, astrocartography, transits, synastry and Lilly's horary method. |
| eastern | Jyotish, BaZi and the Chinese zodiac | A sidereal Vedic chart with nakshatras and dashas, Four Pillars with luck pillars, and your Chinese zodiac portrait. |
| numerology | Numerology studio | Life Path, pinnacles, personal cycles, Pythagorean and Chaldean name readings, two paths and the Lo Shu square. |
| divination | Cards and divination | Lenormand, the Ishtar Reflection Oracle, runes, geomancy and the I Ching, cast in the browser. |
| account | Your account | Sign in, your saved readings, and your birth-detail and browser-saving preferences. |

- [ ] **Step 3: Distribute sections**

Move markup, stylesheets and scripts from the hub `index.html` to each page exactly per the spec's page table. Pages that need birth data include, in order, the astronomy engine, `natal-engine.js`, `birth-profile.js`, `birthday-insights.js`, `birthplace-search.js`, `birth-form.js`, and the `#birthday-form` markup (`index.html:112-149`) above their rooms. `/numerology/` includes the form but hides time and place fields with a `data-form-mode="date-only"` attribute `birth-form.js` honors (it still saves whatever time and place are already stored). `/sky/` includes only `birth-profile.js` and `natal-engine.js` for the daily horoscope's sign. `/account/` holds the account panel (`index.html:192-202`), the sign-in dialog markup, and the journal; `account.js` on other pages renders only the header button and the dialog, so guard the panel wiring with `if (panel)`.

The `#birthday-output` switcher from `natal-room.js` is removed: `/charts/` renders the sky portrait and natal report directly; `/eastern/` renders `ChineseRoom` directly; `/numerology/` attaches `Numerology` directly.

- [ ] **Step 4: Hub**

`index.html` keeps the hero variant, then a `<section class="hub-today">` filled by `hub.js` (Moon phase name from `Astronomy.MoonPhase(new Date())` mapped through the eight `moonNames`, the Sun sign from `BirthProfile.current()` when present, and a link to today's card on `/tarot/`), then eight `<a class="hub-card" href="/tarot/">` cards from `SiteShell.NAV` with label and blurb, then the footer. Hash redirects: a tiny inline script before `SiteShell.mount`:

```js
(function () {
  const map = {'#tarot-readings': '/tarot/', '#ishtar-deck': '/tarot/', '#archive': '/tarot/#archive', '#gallery': '/tarot/#gallery', '#daily-horoscope': '/sky/', '#birthday-room': '/charts/', '#birthday-numbers': '/numerology/', '#birthday-chinese': '/eastern/#chinese', '#astrocartography-room': '/charts/#astrocartography-room', '#celestial-extras': '/charts/#celestial-extras', '#cx-transits': '/charts/#cx-transits', '#cx-synastry': '/charts/#cx-synastry', '#cx-bazi': '/eastern/#bazi', '#chart-in-time': '/charts/#chart-in-time', '#jyotish': '/eastern/#jyotish', '#horary': '/charts/#horary', '#divination-room': '/divination/', '#account-room': '/account/'};
  const target = map[location.hash];
  if (target) location.replace(target);
})();
```

- [ ] **Step 5: `?reading=` opener**

At the end of each page's scripts (before `mobile-sections.js`):

```html
<script>
document.addEventListener('ishtar-account-change', async function once(event) {
  if (!event.detail.signedIn) return;
  document.removeEventListener('ishtar-account-change', once);
  const result = await Rooms.openFromQuery({search: location.search, getReading: id => IshtarAccount.getReading(id), scrollTo: room => document.querySelector(`[data-room="${room.kind}"]`)?.scrollIntoView({block: 'start'})});
  if (result === 'unknown' || result === 'failed') IshtarAccountUI.openPanel('This reading cannot be replayed on this page version.');
});
</script>
```

Give each room's section a `data-room` attribute for every kind it registers (a section may carry several, space-separated; use `[data-room~="kind"]`). `IshtarAccountUI.openPanel` on non-account pages navigates to `/account/` with the message in `sessionStorage` under `ishtar-account-message`, which `/account/` shows once.

- [ ] **Step 6: Verify each page**

Browser at 1400px and 390px, per page: no console errors except the signed-out 401, every section renders and works as on the single page, the nav marks the current page, the birth profile entered on `/charts/` appears on `/eastern/`, `/numerology/` and `/sky/`, opening a saved reading from `/account/` lands on the right page and loads it, an old `#horary` link on the hub redirects.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: hub plus seven topic pages sharing the shell, birth profile and journal"
```

### Task 8: sitemap, robots, nginx and deployment

**Files:**
- Create: `sitemap.xml`, `robots.txt`
- Modify: `server/nginx-ishtar-app.conf` (add the static `try_files` note), `server/deploy-app.sh`
- Modify: `docs/deployment.md`

- [ ] **Step 1: Files**

`robots.txt`:

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /account/
Sitemap: https://ishtarinsights.com/sitemap.xml
```

`sitemap.xml` lists the hub and the six public topic pages with `<lastmod>` set to the deploy date; `/account/` is omitted.

- [ ] **Step 2: nginx**

The site's `location / {` block must read `try_files $uri $uri/ =404;` (directory pages resolve to their `index.html` through nginx's `index` default). Add to `server/nginx-ishtar-app.conf`'s header comment that the static block needs this, and to `server/deploy-app.sh` a check `grep -q 'try_files $uri $uri/' /etc/nginx/sites-available/ishtarinsights.com || echo 'WARNING: add try_files $uri $uri/ =404 to location /'`. Apply on the VPS with `nginx -t` then reload; verify `curl -I https://ishtarinsights.com/tarot/` is 200 and `/tarot` (no slash) is a 301 to `/tarot/`.

- [ ] **Step 3: Deploy and document**

Deploy with the release procedure. In `docs/deployment.md` add the entry; create `docs/SITE-STRUCTURE.md` with the page table, the shell mount points, the script order per page, the `data-fold` and `data-room` attributes, and the hash redirect map; update each `docs/*.md` first paragraph to name its page (`#horary` → `/charts/#horary`).

```bash
git add sitemap.xml robots.txt server docs
git commit -m "feat: sitemap, robots and nginx directory pages; document the site structure"
```

---

## Self-review

- **Spec coverage.** Part A pages (Task 7), shell (Task 6), birth profile (Task 4), module loading (Tasks 5, 7), navigation and discoverability (Tasks 7, 8). Part B registry (Task 2), payload table (kinds in Task 1; later sub-projects add their own kinds and `current()`/`load()` implementations), server (Task 1), journal (Task 3), guest state (Task 3). C0 out-of-scope items untouched.
- **Consistency.** `Rooms.register/get/list/pageFor/openFromQuery` and `BirthProfile.load/save/restore/current/subscribe/setReturnLocation` are used with the same names in every task. `window.TarotRoom`, `window.BirthRoom`, `window.DivinationRoom` keep their names. The kinds list in `kinds.py` and `PAGES` in `rooms.js` match.
- **Risk.** Task 5 and Task 7 are large moves; each ends with a browser pass on every section and a full test run, and milestones 1 and 2 each deploy on their own so a regression is bisectable to one milestone.
