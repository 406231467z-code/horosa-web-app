# PHASE 5-B — Clean-room browser engine feasibility

This is an isolated evaluation, **not the production calculator**. It pins the MIT-licensed `caelus@0.25.0` engine without adding it to the Horosa app bundle or changing `src/services/astro.js`.

The runner loads the existing captured `realChartResult.json` (1990-06-15 10:30 +08, Shanghai, tropical zodiac, Regiomontanus) and compares these fields to the candidate:

- Sun through Pluto ecliptic longitude, latitude, and daily longitude speed
- Ascendant and Midheaven longitude
- Twelve house-cusp longitudes

The report uses the migration experiment's predeclared 1-arcsecond tolerance and records missing values separately. It is not a complete Horosa-result-schema test: aspects, Arabic lots, star catalogs, sect/dignity fields, paran, Qizheng, direction calculations, sidereal variants, and the wider date/calendar matrix remain out of scope.

A report that says `BLOCKED` must not be bypassed by widening tolerances or treating the candidate as a production replacement. The result is written to `results/historical-1990.json`.
