/* Captures the pre-extraction wheel output so bi-wheel.js can be proven identical. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = {NatalEngine: require(path.join(root, 'natal-engine.js')), module: undefined};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'celestial-extras.js'), 'utf8'), context);
// Top-level `const CelestialExtras = ...` binds in the context's lexical scope but is not
// copied onto the sandbox object (only `var`/function declarations are) — bridge it explicitly.
vm.runInContext('this.CelestialExtras = CelestialExtras;', context);

const point = (name, symbol, longitude) => ({name, symbol, longitude, ...context.NatalEngine.placement(longitude)});
const inner = [point('Sun', '☉', 12.5), point('Moon', '☾', 100.25), point('Mars', '♂', 187.75)];
const outer = [point('Venus', '♀', 42), point('Jupiter', '♃', 250.5), point('Saturn', '♄', 333.125)];
const cases = {
  'with-contact': [inner, outer, {type: 'Square', symbol: '□', aLongitude: 12.5, bLongitude: 100.25}, ['Birth sky', 'Selected day']],
  'no-contact': [inner, outer, null, ['Your birth sky', 'Other person']],
  'crowded-labels': [
    [point('Sun', '☉', 10), point('Mercury', '☿', 13), point('Venus', '♀', 15), point('Mars', '♂', 18)],
    outer, null, ['Birth sky', 'Selected day']
  ]
};

const golden = Object.fromEntries(Object.entries(cases).map(([key, args]) => [key, context.CelestialExtras.wheel(...args)]));
fs.writeFileSync(path.join(root, 'tests/fixtures/bi-wheel-golden.json'), JSON.stringify({cases, golden}, null, 2) + '\n');
console.log('captured', Object.keys(golden).length, 'cases');
