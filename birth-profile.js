/* Owns the stored birth profile: reads/writes it, resolves it into a natal chart via
   NatalEngine, and notifies subscribers on every change. Consumers (astrocartography,
   celestial extras, chart in time, Jyotish, horary, daily horoscope) subscribe instead
   of being fanned out to by app.js. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BirthProfile = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function create({storage, natalEngine, key = 'arcana-birthday-profile-v1'}) {
    const subscribers = new Set();
    let state = null;
    function load() { try { const p = JSON.parse(storage.getItem(key)); return p?.birthday ? p : null; } catch { return null; } }
    function resolve(profile) {
      if (!profile) return null;
      const natal = natalEngine.calculate({birthday: profile.birthday, time: profile.time || '', location: profile.placeLocation, houseSystem: profile.houseSystem || 'placidus', fold: profile.fold || '', orbScale: profile.orbScale || 1});
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
  const BirthProfile = {create};
  // NatalEngine is a top-level `const` in a classic script, not a window property --
  // guard on the bare identifiers (typeof is safe against undeclared names) rather than
  // window.NatalEngine, which is always undefined.
  if (typeof window !== 'undefined' && typeof IshtarStorage !== 'undefined' && typeof NatalEngine !== 'undefined') {
    window.BirthProfile = Object.assign(BirthProfile, BirthProfile.create({storage: IshtarStorage, natalEngine: NatalEngine}));
  }
  return BirthProfile;
});
