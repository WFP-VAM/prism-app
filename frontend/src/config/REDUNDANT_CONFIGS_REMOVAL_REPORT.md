# Redundant Config Removal Report

Audit trail for deduplicating country `layers.json` files against `shared/layers.json`.

**Status:** Merged. Post-merge fixes applied so runtime config matches `master`.

## What changed

Country layer files only keep overrides. Properties identical to `shared/layers.json` were removed at merge time (country wins when values differ).

**Preserved:** custom styles, legends, `chart_data`, boundary paths, validity/coverage windows, blended-rainfall WMS params, and any other country-specific values.

## Summary

| Metric | Count |
|--------|------:|
| Countries updated | 19 |
| Layer entries trimmed | 560 |
| Layer entries removed entirely | 18 |
| Redundant properties removed | 4,256 |

### Countries touched

`cambodia`, `cameroon`, `cuba`, `ecuador`, `haiti`, `indonesia`, `kyrgyzstan`, `myanmar`, `namibia`, `nepal`, `nigeria`, `rbd`, `sierraleone`, `southsudan`, `srilanka`, `tajikistan`, `tanzania`, `ukraine`, `zimbabwe`

(`mongolia` was not part of the bulk sweep; see follow-up fixes below.)

## Properties removed (by frequency)

| Property | Times removed | Shared value |
|----------|--------------:|--------------|
| `type` | 560 | `boundary` / layer type from shared |
| `base_url` | 560 | `https://api.earthobservation.vam.wfp.org/ows/` |
| `opacity` | 560 | `0.8` |
| `date_interval` | 558 | `days` |
| `server_layer_name` | 556 | (per-layer shared name) |
| `title` | 489 | (per-layer shared title) |
| `additional_query_params` | 425 | (per-layer shared WMS style) |
| `legend_text` | 385 | (per-layer shared text) |
| `wcsConfig` | 153 | `{ "scale": 0.1, "offset": 0, "pixelResolution": 64 }` |
| `start_date` | 7 | `today` |
| `legend` | 3 | (shared legend id) |

Removing `additional_query_params` is **not** a visual change when the country value matched shared — merged config still resolves to the same WMS style.

## Layers removed entirely

Duplicate entries where **every** property matched shared (country file added nothing):

| Country | Layers removed |
|---------|------------------|
| haiti | `rain_anomaly_2month`, `rain_anomaly_4month`, `rain_anomaly_5month`, `rainfall_agg_2month`, `rainfall_agg_4month`, `rainfall_agg_5month` |
| tanzania | same six layer ids |
| zimbabwe | same six layer ids |

## Post-merge fixes

Review after merging `master` caught cases where dedup or merge drift could change runtime behavior. Fixed in:

| Commit | Change |
|--------|--------|
| `fix(config): restore mongolia and zimbabwe layer overrides` | **Mongolia:** restored Sibelius WMS legend `value` fields on `ndvi` and `ModisVHI`. **Zimbabwe:** kept blended precipitation overrides (`additional_query_params`, `validity`, `coverage_window`, legends, legend text) aligned with `master` — including coverage from #1878. |
| `chore(config): sync countriesWithPreprocessedDates.json` | Regenerated via `yarn preprocess-layers` so CI layer-availability check passes after layer entry removals. |

**Verification:** `mongolia/layers.json` and zimbabwe `precip_blended_*` layers match `master` at merge time. Other countries inherit removed boilerplate from `shared/layers.json` with no intended behavior change.

## How to re-check

```bash
cd frontend
yarn preprocess-layers   # refresh countriesWithPreprocessedDates.json if layers change
yarn test config.test.ts # config structure / translation checks
```

Per-country layer diffs: `git diff master -- frontend/src/config/<country>/layers.json`
