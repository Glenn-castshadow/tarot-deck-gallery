/* The birth form: the birth date, time and place inputs, the manual-coordinate fields,
   the house-system and orb settings and the fold field, plus restoring a saved profile
   into them. Submitting writes through BirthProfile; every room that shows the chart
   re-renders from its own subscription rather than being called from here.

   Chart in Time is attached here because its return location is part of the stored
   profile and only this module reads or writes it. Moved verbatim out of app.js. */
(() => {
  'use strict';
  const {localDateKey} = BirthLore;

  const birthdayForm = document.querySelector("#birthday-form");
  const birthdayInput = document.querySelector("#birthday-input");
  const birthTimeInput = document.querySelector("#birth-time");
  const birthPlaceInput = document.querySelector("#birth-place");
  const birthplacePicker = BirthplaceSearch.attach({input:birthPlaceInput,list:document.querySelector("#birth-city-list"),status:document.querySelector("#birth-city-status")});
  // Chart in Time has its own section on /charts/ only; the form also ships on /eastern/
  // and /numerology/, where ChartInTime.attach would throw on a missing root.
  const chartInTimeRoom = document.querySelector("#chart-in-time");
  const chartInTime = chartInTimeRoom ? ChartInTime.attach(chartInTimeRoom, {onLocationChange: persistReturnLocation}) : null;
  if (chartInTime) BirthProfile.subscribe(state => { chartInTime.setBirthChart(state?.natal || null); });

  const houseSystemInput = document.querySelector("#birth-house-system");
  const orbScaleInput = document.querySelector("#birth-orb-scale");
  const foldInput = document.querySelector("#birth-fold");
  const foldField = document.querySelector("#birth-fold-field");
  const manualLocationInput = document.querySelector("#birth-manual-enabled");
  const manualFields = document.querySelector("#birth-manual-fields");

  // /numerology/ needs only the birth date, so it marks the form date-only. The time and
  // place inputs stay in the DOM and keep their restored values, so submitting there saves
  // whatever time and place are already stored rather than clearing them.
  const dateOnly = birthdayForm.dataset.formMode === "date-only";
  if (dateOnly) for (const el of [birthTimeInput.closest("label"), birthdayForm.querySelector(".birthplace-field"), birthdayForm.querySelector(".natal-settings"), foldField]) el.hidden = true;
  // The fold field belongs to the form; the sky portrait it used to be written from is not
  // on every page that carries the form.
  else BirthProfile.subscribe(state => { foldField.hidden = !(state?.natal?.status === "ambiguous" || state?.natal?.ambiguousTime); });

  birthdayInput.max = localDateKey();
  manualLocationInput.addEventListener("change",()=>{manualFields.disabled = !manualLocationInput.checked;manualFields.hidden = !manualLocationInput.checked;});
  birthdayForm.addEventListener("invalid",event=>{const details=event.target.closest("details");if(details) details.open=true;},true);
  for(const input of [birthdayInput,birthTimeInput,birthPlaceInput]) input.addEventListener("input",()=>{foldInput.value="";});
  try {document.querySelector("#birth-timezones").innerHTML=["UTC",...Intl.supportedValuesOf("timeZone")].map(zone=>`<option value="${zone}"></option>`).join("");} catch { /* Manual IANA names remain usable. */ }

  function currentBirthProfile() {
    if (!birthdayInput.value || !birthdayForm.checkValidity()) return null;
    const manual = manualLocationInput.checked ? {source:"manual",label:birthPlaceInput.value.trim() || "Custom location",latitude:Number(document.querySelector("#birth-latitude").value),longitude:Number(document.querySelector("#birth-longitude").value),timeZone:document.querySelector("#birth-timezone").value.trim()} : null;
    return { birthday: birthdayInput.value, time: birthTimeInput.value, place: birthPlaceInput.value.trim() || manual?.label || "", placeLocation: manual || birthplacePicker.getSelection(),houseSystem:houseSystemInput.value,orbScale:Number(orbScaleInput.value),fold:foldInput.value,returnLocation:chartInTime ? chartInTime.getReturnLocation() : (BirthProfile.load()?.returnLocation || null) };
  }
  birthdayForm.addEventListener("submit", event => {
    event.preventDefault();
    const saved = currentBirthProfile();
    if (!saved) return;
    BirthProfile.save(saved);
  });

  // The return location used to persist only as a side effect of re-submitting the birth
  // form, so choosing a city and reloading lost it. Update the stored profile in place
  // instead. No stored profile means storage was declined or no birth date is saved yet --
  // writing one here would create a record the reader never asked for.
  function persistReturnLocation() {
    BirthProfile.setReturnLocation(chartInTime.getReturnLocation());
  }

  function restoreBirthdayProfile() {
    try {
      const savedBirthday = BirthProfile.load();
      if (savedBirthday?.birthday) {
        manualLocationInput.checked = false; manualFields.disabled = true; manualFields.hidden = true;
        birthdayInput.value = savedBirthday.birthday;
        birthTimeInput.value = savedBirthday.time || "";
        birthPlaceInput.value = savedBirthday.place || "";
        birthplacePicker.restore(savedBirthday.placeLocation);
        // Unconditional: this restore runs again mid-session when an account syncs, so a
        // profile without a return location must clear whatever the last one chose.
        chartInTime?.setReturnLocation(savedBirthday.returnLocation || null);
        houseSystemInput.value = ["placidus","whole-sign","equal"].includes(savedBirthday.houseSystem) ? savedBirthday.houseSystem : "placidus";
        orbScaleInput.value = [0.75,1,1.25].includes(Number(savedBirthday.orbScale)) ? String(savedBirthday.orbScale) : "1";
        foldInput.value = savedBirthday.fold || "";
        if(savedBirthday.placeLocation?.source === "manual") {
          manualLocationInput.checked=true;manualFields.disabled=false;manualFields.hidden=false;
          document.querySelector("#birth-latitude").value=savedBirthday.placeLocation.latitude;
          document.querySelector("#birth-longitude").value=savedBirthday.placeLocation.longitude;
          document.querySelector("#birth-timezone").value=savedBirthday.placeLocation.timeZone;
        }
        if(!savedBirthday.placeLocation && savedBirthday.time && savedBirthday.place) birthplacePicker.resolveSaved().then(location=>{
          if(!location || birthdayInput.value!==savedBirthday.birthday || birthTimeInput.value!==savedBirthday.time) return;
          savedBirthday.placeLocation=location;savedBirthday.place=location.label;
          BirthProfile.save(savedBirthday);
        });
      }
    } catch (error) { /* no-op */ }
    BirthProfile.restore();
  }
  restoreBirthdayProfile();
  // The birth-details mobile fold starts open for a first-time visitor; mobile-sections.js
  // reads this attribute at load, so it must be set before that script runs.
  birthdayForm.toggleAttribute('data-fold-open', !birthdayInput.value);
  window.BirthRoom = { restore: restoreBirthdayProfile, currentProfile: currentBirthProfile };
})();
