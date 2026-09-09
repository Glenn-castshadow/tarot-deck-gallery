# World map data

`countries-110m.json` is the Natural Earth 1:110m land and country topology from
`world-atlas@2.0.2`, downloaded from
https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json.

Natural Earth map data is public domain:
https://www.naturalearthdata.com/about/terms-of-use/.

Source packaging: https://github.com/topojson/world-atlas (ISC; license included).
The UI credits Natural Earth. This generalized map is intended for world-scale
exploration, not street navigation or precise political boundary work.

Runtime libraries are vendored locally:

- D3 7.9.0: `vendor/d3/d3.min.js`, ISC license alongside the file.
- topojson-client 3.1.0: `vendor/topojson/topojson-client.min.js`, ISC license alongside.

Both libraries and the geography load when the map approaches the viewport.
The existing GeoNames city index supplies destination search and has its own
CC BY 4.0 attribution in `assets/cities/README.md`.
