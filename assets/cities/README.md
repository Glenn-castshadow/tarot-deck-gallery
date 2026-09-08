# City suggestions

`cities.json` is a compact derivative of [GeoNames](https://www.geonames.org/), licensed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). Source downloads: [cities15000.zip](https://download.geonames.org/export/dump/cities15000.zip), [admin1CodesASCII.txt](https://download.geonames.org/export/dump/admin1CodesASCII.txt), and [countryInfo.txt](https://download.geonames.org/export/dump/countryInfo.txt). Download date is recorded in `builtAt`.

Changes: selected city/location fields, joined region and country names, deduplicated alternate names up to 80 characters, and sorted by population. The JSON's `columns` field documents the positional row format. The September 8, 2026 build contains 34,134 places. GeoNames covers cities above 15,000 residents and capitals in this extract; some smaller places are also present. It is not an exhaustive address or small-village directory, and manually entered place names remain supported.

Regenerate with `python tools/build_city_index.py`. Only this build command downloads from GeoNames. At runtime the index is loaded on demand from the same site, and typed city searches run locally. No API key, third-party geocoding request, location permission or paid service is required.

Selecting a suggestion saves its label, GeoNames ID, coordinates, country/region and IANA time-zone name with the local birthday profile. Editing that text discards the selected coordinates until another suggestion is chosen. Coordinates and the time zone support the natal chart’s angles, houses and civil-time conversion. City coordinates are representative locations, not historical hospital coordinates.

The UI supplies GeoNames and license attribution. If refreshing the data, update its version in `birthplace-search.js` to invalidate cached copies.
