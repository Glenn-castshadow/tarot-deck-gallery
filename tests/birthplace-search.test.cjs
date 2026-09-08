const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {normalize,prepare,search} = require('../birthplace-search.js');
const data = JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/cities/cities.json'),'utf8'));
const cities = prepare(data.cities);

test('bundled city index has worldwide coverage and valid location records', () => {
  assert.ok(cities.length > 30000);
  assert.ok(new Set(cities.map(city => city.countryCode)).size > 200);
  assert.equal(new Set(cities.map(city => city.id)).size, cities.length);
  for (const city of cities) {
    assert.ok(city.name && city.country && city.names.length);
    assert.ok(Number.isFinite(city.latitude) && Math.abs(city.latitude)<=90);
    assert.ok(Number.isFinite(city.longitude) && Math.abs(city.longitude)<=180);
  }
});

test('city prefixes include Torrance, with region and country disambiguation', () => {
  const matches = search(cities,'Torr');
  assert.ok(matches.some(city => city.name==='Torrance' && city.region==='California'));
  const torrance = search(cities,'Torrance, California')[0];
  assert.equal(torrance.countryCode,'US');
  assert.equal(torrance.timeZone,'America/Los_Angeles');
  assert.equal(torrance.label,'Torrance, California, United States');
  assert.equal(search(cities,'Torrance, CA')[0].id,torrance.id);
  assert.equal(search(cities,'Torrance California')[0].id,torrance.id);
});

test('accent-insensitive and alternate-name searches find international cities', () => {
  assert.equal(normalize('  SÃO   PAULO '),'sao paulo');
  assert.equal(search(cities,'sao paulo, Brazil')[0].name,'São Paulo');
  assert.equal(search(cities,'München, Germany')[0].name,'Munich');
  assert.equal(search(cities,'London, Canada')[0].countryCode,'CA');
  assert.equal(search(cities,'Paris, France')[0].countryCode,'FR');
});

test('exact names outrank more populated prefix matches and results are bounded', () => {
  const fixtures = prepare([
    [1,'York','England','United Kingdom','GB','',54,-1,'Europe/London',10,[]],
    [2,'Yorktown','Virginia','United States','US','VA',37,-76,'America/New_York',100000,[]]
  ]);
  assert.equal(search(fixtures,'York')[0].name,'York');
  assert.ok(search(cities,'San').length<=6);
  assert.deepEqual(search(cities,'x'),[]);
  assert.deepEqual(search(cities,''),[]);
  assert.deepEqual(search(cities,'zzzznomatchingcityzzzz'),[]);
});
