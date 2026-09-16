# Numerology depth (C4a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** This plan adds karmic debt, karmic lessons and hidden passion to the numerology studio, and makes a numerology reading saveable to the journal.

**Architecture:** The pure engine additions go in `numerology-engine.js`. The copy, rendering, pure `snapshot`/`restore` helpers and the `numerology` room registration go in `numerology.js`. The backend already accepts the `numerology` kind, so no server change is needed.

**Tech Stack:** Vanilla ES2020 in plain `<script>` tags, with no build step. Tests run with `node --test tests/*.test.cjs`.

**Spec:** `docs/superpowers/specs/2026-09-14-numerology-depth-design.md`

## Global Constraints

Tags: **[Glenn]** his instruction; **[codebase]** already enforced; **[program]** Part E of the program spec; **[spec]** a C4a spec decision taken under Glenn's instruction to complete C4; **[judgement]** mine.

- **No backend change.** Do not touch `server/`, `kinds.py` or migrations. [spec]
- **Karmic debt:** 13, 14, 16 or 19 in the reduction `steps` of Life Path, Birth Day, Expression, Soul Urge or Personality. Name-based extras are Pythagorean only. [spec]
- **Karmic lessons** are digits 1–9 absent from the name's letter values. **Hidden passion** is the most frequent digit or digits, all ties shown. [spec]
- **Saving** stores the birth date and view choices, plus the name, Y choices and system (only when a name reading is open) and the partner date (only when read). The summary never contains the name. The save note says a saved name is stored on the server. [spec, program]
- **Existing views render exactly as today** apart from the new blocks. [spec]
- Copy stays reflective. "Karmic" is the tradition's word, never a claim about past lives, punishment, deserving or fate. No predictions, luck or fortune. Use British spelling, spaced em dashes and curly apostrophes. [codebase, spec]
- Use bare `typeof X !== 'undefined'` guards, never `window.X`. [codebase]
- The studio must be keyboard operable and verified at 390px and 1400px. [program]
- No new dependencies. [Glenn] Bump the cache key of every changed file. [codebase] Commits end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. [session attribution instruction]

---

### Task 1: The engine

**Files:** Modify `numerology-engine.js`, `tests/numerology.test.cjs`

**Produces:**
- `NumerologyEngine.KARMIC_DEBTS` (`[13,14,16,19]`)
- `karmicDebt(result)`, returning the debt number or `null`
- `letterCounts(profile)`, returning an array of length 10 where index d is the count of letters with value d; `null` unless the profile is a ready Pythagorean profile
- `karmicLessons(profile)`, returning digits or `null`
- `hiddenPassion(profile)`, returning `{digits, count}` or `null`

- [ ] **Step 1: Write the failing tests.** Append to `tests/numerology.test.cjs`:

```js
test('karmic debt is 13, 14, 16 or 19 anywhere in a reduction chain', () => {
  assert.deepEqual(N.KARMIC_DEBTS, [13, 14, 16, 19]);
  for (const day of [13, 14, 16, 19]) assert.equal(N.karmicDebt(N.birthday(`2000-01-${day}`).birthDay), day, `day ${day}`);
  for (const day of [1, 22, 28, 31]) assert.equal(N.karmicDebt(N.birthday(`2000-01-${String(day).padStart(2, '0')}`).birthDay), null, `day ${day}`);
  // 1989-10-09: month 10 → 1, day 9, year 1989 → 27 → 9; 1 + 9 + 9 = 19 → 10 → 1.
  const path = N.birthday('1989-10-09').path;
  assert.deepEqual(path.steps, [19, 10, 1]);
  assert.equal(N.karmicDebt(path), 19);
  // D (4) + I (9) = 13 → 4.
  const di = N.nameProfile('DI');
  assert.equal(N.karmicDebt(di.expression), 13);
  assert.equal(N.karmicDebt(null), null);
});

test('karmic lessons and hidden passion count the name’s letter values', () => {
  // A B C → 1 2 3: every other digit is a lesson; 1, 2 and 3 tie at one letter each.
  const abc = N.nameProfile('ABC');
  assert.deepEqual(N.karmicLessons(abc), [4, 5, 6, 7, 8, 9]);
  assert.deepEqual(N.hiddenPassion(abc), {digits: [1, 2, 3], count: 1});
  // ANNA → A1 N5 N5 A1: lessons are everything but 1 and 5; 1 and 5 tie at two.
  const anna = N.nameProfile('Anna');
  assert.deepEqual(N.karmicLessons(anna), [2, 3, 4, 6, 7, 8, 9]);
  assert.deepEqual(N.hiddenPassion(anna), {digits: [1, 5], count: 2});
  // ELEANOR → E5 L3 E5 A1 N5 O6 R9: 5 appears three times.
  const eleanor = N.nameProfile('Eleanor');
  assert.deepEqual(N.letterCounts(eleanor), [0, 1, 0, 1, 0, 3, 1, 0, 0, 1]);
  assert.deepEqual(N.hiddenPassion(eleanor), {digits: [5], count: 3});
  assert.deepEqual(N.karmicLessons(eleanor), [2, 4, 7, 8]);
});

test('lessons and passion are Pythagorean only and need a ready name', () => {
  assert.equal(N.karmicLessons(N.nameProfile('Anna', [], null, 'chaldean')), null);
  assert.equal(N.hiddenPassion(N.nameProfile('Anna', [], null, 'chaldean')), null);
  assert.equal(N.letterCounts(N.nameProfile('')), null);
});
```

Check the three hand counts against the Pythagorean table (A=1 … I=9, J=1 … R=9, S=1 … Z=8) before implementing: ANNA is A1 N5 N5 A1, and ELEANOR is E5 L3 E5 A1 N5 O6 R9. If a count is wrong, fix the test and say so in your report.

- [ ] **Step 2: Run the tests** to see them fail, then implement before the final `return`:

```js
  const KARMIC_DEBTS=[13,14,16,19];
  // A karmic debt number is one of 13, 14, 16, 19 met on the way to a number's final value.
  const karmicDebt=result=>result&&Array.isArray(result.steps)?(result.steps.find(n=>KARMIC_DEBTS.includes(n))??null):null;
  function letterCounts(profile) {
    if(!profile||profile.status!=='ready'||profile.system==='chaldean'||!Array.isArray(profile.letters)) return null;
    const counts=Array(10).fill(0);
    profile.letters.forEach(x=>{counts[x.value]++;});
    return counts;
  }
  function karmicLessons(profile) {
    const counts=letterCounts(profile);
    return counts?[1,2,3,4,5,6,7,8,9].filter(d=>counts[d]===0):null;
  }
  function hiddenPassion(profile) {
    const counts=letterCounts(profile);
    if(!counts) return null;
    const count=Math.max(...counts.slice(1));
    return {digits:[1,2,3,4,5,6,7,8,9].filter(d=>counts[d]===count),count};
  }
```

Add `KARMIC_DEBTS,karmicDebt,letterCounts,karmicLessons,hiddenPassion` to the return. Before that, confirm that a Pythagorean `nameProfile` result has no `system` field and a Chaldean one has `system:'chaldean'`; the code above relies on it.

- [ ] **Step 3: Run the tests and suite, then commit** `numerology-engine.js` and `tests/numerology.test.cjs`: `feat(numerology): karmic debt, lessons and hidden passion`.

---

### Task 2: Copy and rendering

**Files:** Modify `numerology.js`, `numerology.css`, `numerology/index.html`, `tests/numerology.test.cjs`

- [ ] **Step 1: Copy.** In `numerology.js`, add original copy objects:
  - `karmicDebtCopy` with keys 13, 14, 16 and 19. Each entry is `{title, words, story, prompt}` in the style of `challengeCopy`.
  - `lessonCopy` with keys 1–9. Each is one or two sentences framing an absent number as a theme the name does not already carry, and so one worth practising deliberately.
  - `passionCopy` with keys 1–9. Each is one or two sentences framing the most frequent number as a theme the name returns to often.

  Name "karmic" as the tradition's term once, in the section intros, and make no claim about past lives, punishment, deserving or fate. Expose these copy objects on the `Numerology` export, e.g. `Numerology.copy = {karmicDebtCopy, lessonCopy, passionCopy}`, so a test can scan them.
- [ ] **Step 2: Birth numbers.** When `karmicDebt(birth.path)` or `karmicDebt(birth.birthDay)` is not null, render a "Karmic debt" block after the existing core numbers. It shows each debt as `N/root` with its role label (Life Path, Birth Day), the title, story and prompt, and one line explaining the convention (see the spec's Decisions table). Render nothing when neither carries a debt.
- [ ] **Step 3: Name reading.**
  - **Pythagorean:** after the existing name numbers, render:
    - a karmic debt block for Expression, Soul Urge and Personality, when any carries one;
    - "Karmic lessons": the absent digits with their copy, or a sentence saying every number from one to nine appears in the name;
    - "Hidden passion": the digit or digits with the count, e.g. "5 · carried by three letters", and their copy.
  - **Chaldean:** render one sentence saying these three readings use the Pythagorean letter values and switching systems shows them.
  - Every count sentence must be true of the data. Use "letter" or "letters" correctly, and spell out or number the count consistently.
- [ ] **Step 4: Styles and tests.** Style the blocks following the studio's existing card patterns so they hold at 390px and 1400px. Bump `numerology.js` and `numerology.css` on `numerology/index.html`; grep for any other page that loads them. Add a test that every `karmicDebtCopy`, `lessonCopy` and `passionCopy` entry exists and that none matches `/punish|deserv|past life|past lives|curse|doom|you will|\bluck|fortune|fate\b|destined/i`. The existing tests only read `numerology.js` as source text, and it has no `module.exports`. Add the repo's guarded export at the foot of the IIFE, change `const E = NumerologyEngine` to `typeof NumerologyEngine !== 'undefined' ? NumerologyEngine : require('./numerology-engine.js')`, and confirm nothing else at module top level touches a browser global. The browser block at the foot is already typeof-guarded.
- [ ] **Step 5:** Run the suite and commit by file name: `feat(numerology): karmic debt, lessons and passion in the studio`.

---

### Task 3: Saving and opening a numerology reading

**Files:** Modify `numerology.js`, `numerology/index.html`, `tests/numerology.test.cjs`, `tests/pages.test.cjs`

- [ ] **Step 1: Pure helpers.** Export `Numerology.snapshot(state, birth)` and `Numerology.restore(payload)`.

  `snapshot(state, birth)` returns `{kind:'numerology', deck:'', layout:state.tab, question:'', focus:'', payload, summary}`, where `payload` is `{v:1, birthday:birth.parts.value, tab, core, period, cycleDate, arc, arcView, pairView, nameSystem, name?, yVowels?, partnerDate?}`:
  - include `name` and `yVowels` only when `state.nameRead` and the name is non-empty;
  - include `partnerDate` only when `state.partnerRead`;
  - `summary` is `Life Path ${birth.path.value}${birth.path.master?'/'+birth.path.root:''}`, plus ` · name reading` when the name is included.

  `restore(payload)` returns `{birthday, previous}` or `null`. `previous` is the `attach` "previous" object and holds the same validation `attach` applies, so reuse its accepted sets:
  - reject a non-object or an invalid `birthday`;
  - cap `name` at 120 characters;
  - keep only integer `yVowels` within the name's letter range;
  - set `nameRead:true` only when a name is present, and `partnerRead:true` only when `partnerDate` parses.
- [ ] **Step 2: Tests.** Round-trip `restore(snapshot(...).payload)` for a state with and without a name and partner. Assert that the summary never contains the name, that a malformed payload returns `null`, that unknown tabs fall back, that an over-long name is capped, and that out-of-range Y indices are dropped.
- [ ] **Step 3: The room.** In the browser block at the foot of `numerology.js`:
  - **Registration.** Guard with bare `typeof Rooms !== 'undefined'` and register `Rooms.register('numerology', {label:'Numerology', category:'numerology', current, load})`. The label must match `rooms.js` and `kinds.py` ("Numerology").
  - **`current()`** returns `snapshot(room.getState(), birthOf(room))`, or `null` when no studio is attached. To get the birth, have `attach` return it, or recompute it from the attached parts.
  - **`load(reading)`** runs `restore(reading.payload)`, and returns `false` when that yields `null` or `#birthday-numbers` is missing. Otherwise it destroys any attached studio and attaches with `BirthLore.birthdayParts(birthday)` and `previous`. It marks the studio as showing a saved reading, so a subscriber callback that arrives with the same profile does not immediately replace it; the next genuine profile change does. It shows a short line at the top of the studio: "Showing a saved reading for {date}. Your birth profile is unchanged." Then it returns `true`. Read `rooms.js` `openFromQuery` to see when `load` runs relative to `BirthProfile` restoring.
- [ ] **Step 4: Save control.**
  - **Placement and label.** Add `<p class="save-reading"><button type="button" data-save-reading="numerology">…</button><span role="status" aria-live="polite"></span></p>` under the studio footnote. Label it like `divination.js`'s `saveControl()`: "Save this reading to my journal" when signed in, "Sign in to save this reading" when not. Re-render the label on `ishtar-account-change`.
  - **Name note.** Add a short note beside the control that is true for the current state: when a name reading is open, "Saving includes the name you entered."; otherwise nothing about names. The document-level handler in `account.js` does the saving.
- [ ] **Step 5: Keys and page test.** Bump `numerology.js` on `numerology/index.html`. In `tests/pages.test.cjs`, record `rooms.js` for `numerology.js` per the file's header rule, since `rooms.js` already loads earlier on the page.
- [ ] **Step 6:** Run the suite and commit by file name: `feat(numerology): save and reopen numerology readings`. Do not attempt browser verification.

---

### Task 4: Documentation

- [ ] In `docs/NUMEROLOGY.md`, document the three readings with their conventions and the reason each exists: the debt chain rule and where it is shown; lessons and passion as Pythagorean only, with ties shown. Also document saving: what the payload holds, that the name is stored on the server when a name reading is open, that the summary omits the name, and what opening a saved reading does. Check every claim against the code, and use the real test count. Commit: `docs: karmic debt, lessons, passion and numerology saving`.

---

## Notes for the executor

- Stop dev preview servers before any merge. Never use `git add -A`. In PowerShell, use `git commit -F <file>`. Commands on `V:` can take over two minutes. The suite before this plan is 518 passing.
