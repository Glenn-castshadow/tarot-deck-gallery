/* Regenerates tests/fixtures/bi-wheel-golden.json, the golden that pins bi-wheel.js to the
   wheel markup the celestial-extras section shipped before the renderer was extracted.

   Pass an output path to capture somewhere else -- that is how the tool is proven to still
   reproduce the committed fixture byte for byte without overwriting it:
     node tools/capture_bi_wheel_golden.cjs /tmp/check.json && cmp /tmp/check.json tests/fixtures/bi-wheel-golden.json
*/
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
// bi-wheel.js is loaded the way index.html loads it -- as a browser global reading an
// already-defined NatalEngine -- rather than required, so the tool captures the same
// code path the page runs.
const context = {NatalEngine: require(path.join(root, 'natal-engine.js')), module: undefined};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'bi-wheel.js'), 'utf8'), context);
// Top-level `const BiWheel = ...` binds in the context's lexical scope but is not
// copied onto the sandbox object (only `var`/function declarations are) — bridge it explicitly.
vm.runInContext('this.BiWheel = BiWheel;', context);

const point = (name, symbol, longitude) => ({name, symbol, longitude, ...context.NatalEngine.placement(longitude)});
const inner = [point('Sun', '☉', 12.5), point('Moon', '☾', 100.25), point('Mars', '♂', 187.75)];
const outer = [point('Venus', '♀', 42), point('Jupiter', '♃', 250.5), point('Saturn', '♄', 333.125)];
// Kept positional to match the fixture's stored shape, which tests/bi-wheel.test.cjs
// destructures; render() takes them as one options object.
const cases = {
  'with-contact': [inner, outer, {type: 'Square', symbol: '□', aLongitude: 12.5, bLongitude: 100.25}, ['Birth sky', 'Selected day']],
  'no-contact': [inner, outer, null, ['Your birth sky', 'Other person']],
  'crowded-labels': [
    [point('Sun', '☉', 10), point('Mercury', '☿', 13), point('Venus', '♀', 15), point('Mars', '♂', 18)],
    outer, null, ['Birth sky', 'Selected day']
  ]
};

const golden = Object.fromEntries(Object.entries(cases).map(([key, [innerRing, outerRing, contact, labels]]) =>
  [key, context.BiWheel.render({inner: innerRing, outer: outerRing, contact, labels})]));
const target = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'tests/fixtures/bi-wheel-golden.json');
fs.writeFileSync(target, JSON.stringify({cases, golden}, null, 2) + '\n');
console.log('captured', Object.keys(golden).length, 'cases to', target);
