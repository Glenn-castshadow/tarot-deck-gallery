/* Geocentric, true-latitude angular lines. No atmospheric refraction or parallax. */
const AstrocartographyEngine = (() => {
  const astro = typeof Astronomy !== 'undefined' ? Astronomy : require('./vendor/astronomy-engine/astronomy.js');
  const D = Math.PI / 180, radiusKm = 6371.0088;
  const wrap = value => ((value + 180) % 360 + 360) % 360 - 180;
  const clamp = value => Math.max(-1, Math.min(1, value));
  const names = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const vector = ([lon, lat]) => [Math.cos(lat * D) * Math.cos(lon * D), Math.cos(lat * D) * Math.sin(lon * D), Math.sin(lat * D)];
  const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const unit = a => { const length = Math.hypot(...a); return length > 1e-12 ? a.map(value => value / length) : null; };
  const angle = (a, b) => Math.atan2(Math.hypot(...cross(a, b)), clamp(dot(a, b)));

  function linesFor(ra, dec, siderealDegrees, planet) {
    const mc = wrap(ra * 15 - siderealDegrees);
    const meridian = lon => Array.from({length:181}, (_, i) => [lon, -90 + i]);
    // Beyond this latitude the body is circumpolar: there is no horizon crossing.
    const limit = Math.min(89.999999, 90 - Math.abs(dec));
    const rising = [], setting = [];
    for (let i = 0; i <= 360; i++) {
      const lat = -limit + 2 * limit * i / 360;
      const hourAngle = Math.acos(clamp(-Math.tan(lat * D) * Math.tan(dec * D))) / D;
      rising.push([wrap(mc - hourAngle), lat]);
      setting.push([wrap(mc + hourAngle), lat]);
    }
    return [['MC', meridian(mc)], ['IC', meridian(wrap(mc + 180))], ['ASC', rising], ['DSC', setting]].map(([kind, coordinates]) => ({
      id: `${planet}-${kind}`, planet, kind, geometry: {type:'LineString', coordinates}
    }));
  }

  function calculate(dateValue) {
    if (!dateValue) throw Error('A resolved birth instant is required.');
    const date = new Date(dateValue);
    // A supported local birth date may resolve to an adjacent UTC calendar year.
    if (!Number.isFinite(+date) || +date < Date.UTC(1900,11,31) || +date >= Date.UTC(2101,0,2)) throw Error('Map calculations support birth dates from 1901 to 2100.');
    const time = astro.MakeTime(date), siderealDegrees = astro.SiderealTime(time) * 15;
    const rotation = astro.Rotation_EQJ_EQD(time);
    const planets = names.map(name => {
      const equator = astro.EquatorFromVector(astro.RotateVector(rotation, astro.GeoVector(name, time, true)));
      return {name, ra:equator.ra, dec:equator.dec, lines:linesFor(equator.ra, equator.dec, siderealDegrees, name)};
    });
    return {date:date.toISOString(), siderealDegrees, planets, lines:planets.flatMap(planet => planet.lines)};
  }

  // Shortest spherical distance to the actual line segment, including endpoints.
  // Sampling defines the rising/setting half of the horizon, not a same-latitude shortcut.
  function segmentDistance(p, a, b) {
    let best = Math.min(angle(p, a), angle(p, b));
    const normal = unit(cross(a, b));
    if (!normal) return best;
    const projection = unit(p.map((value, i) => value - dot(p, normal) * normal[i]));
    if (!projection) return best;
    const span = angle(a, b);
    for (const q of [projection, projection.map(value => -value)]) {
      if (angle(a, q) + angle(q, b) <= span + 1e-8) best = Math.min(best, angle(p, q));
    }
    return best;
  }

  function nearestLines(model, location, planetNames = names, kinds = ['ASC','DSC','MC','IC']) {
    const {longitude, latitude} = location;
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw Error('Choose a valid point on the map.');
    const p = vector([longitude, latitude]);
    return model.lines.filter(line => planetNames.includes(line.planet) && kinds.includes(line.kind)).map(line => {
      const points = line.geometry.coordinates.map(vector);
      let distance = Infinity;
      for (let i = 1; i < points.length; i++) distance = Math.min(distance, segmentDistance(p, points[i-1], points[i]));
      return {id:line.id, planet:line.planet, kind:line.kind, distanceKm:distance * radiusKm};
    }).sort((a, b) => a.distanceKm - b.distanceKm);
  }
  return {calculate, linesFor, nearestLines, names, wrap};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AstrocartographyEngine;
