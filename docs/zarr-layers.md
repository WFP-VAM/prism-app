# Zarr layers

How PRISM renders **Zarr** layers: how they differ from WMS and COG, the request/render pipeline, GeoZarr metadata synthesis, and configuration. Every layer configured today happens to come from a [dynamical.org](https://dynamical.org/) Icechunk repository, but no code branches on the provider.

For user-facing configuration, see the `zarr` section in the main [README](../README.md). For the date model (reference date, validity, query date), see [dates.md](dates.md). For the shared GPU colormap pipeline used by both COG and Zarr layers, see [cog-layers.md](cog-layers.md#rendering-pipeline).

## What a Zarr layer is

A Zarr layer streams a cloud-optimized Zarr dataset from dynamical.org's [STAC catalog](https://stac.dynamical.org/catalog.json) and renders it **client-side** with [deck.gl](https://deck.gl/). The browser opens an [Icechunk](https://icechunk.io/) repository directly (via `icechunk-js` + `zarrita`), fetches only the Zarr chunks that intersect the **current map viewport**, and colorizes pixels on the GPU.

| Concern | WMS layer | COG layer | Zarr layer |
| --- | --- | --- | --- |
| Rendering | Map server returns PNG/JPEG tiles | Browser reads GeoTIFF bytes, colorizes on GPU | Browser reads Zarr chunks, colorizes on GPU |
| Spatial coverage | Server tiles | Presigned URLs filtered to deployment `bbox` | **Live viewport** (pan/zoom loads new chunks) |
| PRISM API | Optional | Required (`/cog_presigned_url`, `/cog_proxy`) | **None** — browser reads S3 over HTTPS |
| Date source | WMS / WCS server | WMS GetCapabilities | STAC temporal extent or forecast valid times |

Zarr layers are designed to **behave like WMS/COG layers** in the UI (date selection, opacity, mutual exclusivity, render below admin boundaries). See [UI parity](#ui-parity-with-wms-and-cog).

## Configuration

Zarr layers are defined in per-country or shared `layers.json` with `type: "zarr"`. The TypeScript shape is `ZarrLayerProps` in [`frontend/src/config/types.ts`](../frontend/src/config/types.ts):

```ts
export class ZarrLayerProps extends CommonLayerProps {
  type: 'zarr' = 'zarr';
  timeLayout: ZarrTimeLayout = 'analysis';  // 'analysis' | 'forecast' — cube time layout only
  store?: ZarrStore;          // 'icechunk' only; omitting is equivalent to 'icechunk'
  stacItem: string;           // STAC collection URL
  variable: string;           // Zarr array name, e.g. temperature_2m
  ensemble?: boolean;         // forecast ensemble; requires timeLayout: forecast (renders ensemble mean)
  valueScale?: number;        // unit multiplier after CF scaling (e.g. 3600 for mm/s → mm/h)
  repoUrl?: string;           // optional override; normally resolved from STAC
  valueRange?: [number, number];  // GPU rescale min/max (defaults from legend)
  initTimeDim?: string;       // default init_time
  leadTimeDim?: string;       // default lead_time
  ensembleDim?: string;       // default ensemble_member
  units?: string;
  attribution?: string;
  // title, legend, legendText required
}
```

### Two independent axes

The two fields above that describe the dataset itself answer different questions, and neither is named after a data provider (config keys are snake_case and camelCased on load):

- **`time_layout`** (required) — how time indices are selected from the cube. `analysis` for a single `time × latitude × longitude` layout (e.g. NOAA GFS analysis); `forecast` for `init_time + lead_time` (and optionally `ensemble_member`), declared explicitly in config. This describes **layout, not data vintage**: an archived forecast cube full of past model runs is still `forecast`, because the layout is what drives index selection.
- **`store`** (optional, defaults to Icechunk v2) — how the bytes are opened. Only `icechunk` is implemented.

A third concern — the **metadata convention** (native [GeoZarr](https://github.com/zarr-developers/geozarr-spec) attrs vs. plain CF cubes needing the [shim](#geozarr-metadata-shim)) — is deliberately **not** a config field. GeoZarr is a convention, not a store: GeoZarr data can live in an `http` store or inside an Icechunk repo, so it is never a `store` value and should be detected from group attrs at runtime instead of declared. See the [roadmap](#supported-today-vs-roadmap).

Unsupported values for either field are rejected at config load by `getLayerByKey` in [`frontend/src/config/utils.ts`](../frontend/src/config/utils.ts) with an explicit error, rather than failing deeper in the stack. The implemented values are listed once in `SUPPORTED_ZARR_TIME_LAYOUTS` / `SUPPORTED_ZARR_STORES` in [`types.ts`](../frontend/src/config/types.ts), which both the TypeScript unions and that validation derive from.

Multiple layer entries can share the same `stac_item` (same Icechunk repo) with different `variable` names.

### Analysis layers (`time_layout: analysis`)

Snap the selected timeline date to the nearest index in the `time` coordinate array.

### Forecast layers (`time_layout: forecast`)

Forecast behavior is **declared in config**, not inferred from Zarr dims:

- **`init_time`** is always pinned to the **latest model run** (newest index).
- **`lead_time`** is chosen so `init_time + lead_time` best matches the selected timeline date (valid time).
- When **`ensemble: true`**, the full **`ensemble_member`** axis is read per tile and averaged client-side (ensemble mean over 51 members; NaN/`_FillValue` excluded).

Example forecast layer entry:

```json
"ecmwf_aifs_ens_t2m": {
  "title": "Temperature 2m (ECMWF AIFS ENS forecast, dynamical.org)",
  "type": "zarr",
  "time_layout": "forecast",
  "store": "icechunk",
  "ensemble": true,
  "stac_item": "https://stac.dynamical.org/ecmwf-aifs-ens-forecast/collection.json",
  "variable": "temperature_2m",
  "value_range": [-40, 50],
  "units": "°C",
  "legend": "dynamical_t2m",
  "legend_text": "2m air temperature ensemble forecast (°C).",
  "attribution": "ECMWF AIFS ENS forecast data processed by dynamical.org.",
  "opacity": 0.75
}
```

## End-to-end data flow

1. **Resolve STAC** — [`fetchDynamicalStacMetadata`](../frontend/src/components/MapView/Layers/ZarrLayer/stac.ts) fetches the collection document, finds the `icechunk` (or "Icechunk v2 repository") asset, and converts `s3://` hrefs to anonymous HTTPS URLs (`https://{bucket}.s3.us-west-2.amazonaws.com/{prefix}/`).
2. **Open dataset** — [`openZarrDataset`](../frontend/src/components/MapView/Layers/ZarrLayer/icechunk-store.ts) opens the repo with `icechunk-js`, pins a snapshot, reads variable metadata and `time` / `latitude` / `longitude` coordinate arrays, and caches per `(repoUrl, variable)`.
3. **GeoZarr shim** — [`buildGeoZarrMetadata`](../frontend/src/components/MapView/Layers/ZarrLayer/geozarr-shim.ts) synthesizes `spatial:*` and `proj:code` attrs that dynamical's plain CF cubes lack, validated with `@developmentseed/geozarr`'s `parseGeoZarrMetadata`.
4. **Time selection** — for `analysis`, snap the selected date to the nearest `time` index. For `forecast`, pin latest `init_time` and nearest `lead_time` for valid time; when `ensemble: true`, leave `ensemble_member` unpinned (`null`) and reduce to the mean in [`tile-handlers.ts`](../frontend/src/components/MapView/Layers/ZarrLayer/tile-handlers.ts) ([`resolveForecastSelection`](../frontend/src/components/MapView/Layers/ZarrLayer/icechunk-store.ts)).
5. **Register deck.gl layer** — a single `DeckZarrLayer` is registered in [`DeckGLLayersContext`](../frontend/src/components/MapView/DeckGLLayersContext.tsx) and rendered via [`DeckGLOverlay`](../frontend/src/components/MapView/DeckGLOverlay.tsx) (`interleaved: true`, `beforeId` for z-order).

Unlike COG layers, there is **no presign or proxy step** — the Icechunk store reads S3 directly from the browser. dynamical.org buckets are on AWS Open Data and expose CORS for anonymous reads.

## Viewport tiling

`@developmentseed/deck.gl-zarr`'s `ZarrLayer` extends `RasterTileLayer`: it pairs the Zarr **native chunk grid** with deck.gl's tile layer so only chunks intersecting the **current deck viewport** are requested. Panning and zooming fetch new chunks; coverage is not limited to `appConfig.map.boundingBox` (unlike COG presign filtering). For each visible tile the layer builds a `sliceSpec` (spatial dims bounded to the tile, non-spatial dims pinned from `selection`) and calls the app's `getTileData`, which runs `zarr.get(arr, sliceSpec)`.

## GeoZarr metadata shim

dynamical.org cubes are plain CF Zarr (`time`, `latitude`, `longitude` coordinate arrays) without GeoZarr convention attributes, and deck.gl-zarr needs GeoZarr metadata to derive the tile pyramid, affine transform, and CRS.

[`geozarr-shim.ts`](../frontend/src/components/MapView/Layers/ZarrLayer/geozarr-shim.ts) synthesizes `spatial:dimensions` (the y/x dim names only — non-spatial dims come from the zarr array and `selection`), `spatial:transform` (a 6-parameter affine derived from coordinate spacing), `spatial:shape`, and `proj:code`, validates them with `@developmentseed/geozarr`'s `parseGeoZarrMetadata`, and passes them to `DeckZarrLayer` via the `metadata` prop rather than writing them back to the store. Datasets that already follow GeoZarr carry these attrs natively — see the [metadata convention roadmap](#metadata-convention-no-config-field).

## Rendering pipeline

Only `getTileData` is Zarr-specific: `zarr.get` → coerce to `Float32` (ensemble mean when `ensemble: true`) → apply CF `scale_factor` / `add_offset` / optional `value_scale` → upload as an `r32float` texture. From there `renderTile` is the shared COG path (rescale + colormap), documented in [cog-layers.md](cog-layers.md#rendering-pipeline).

When the time index changes, the component re-registers the layer with `updateTriggers` on `getTileData` / `renderTile` so cached tiles are invalidated.

## Date discovery

Zarr layers do **not** use WMS GetCapabilities. Available dates depend on `time_layout`:

- **`analysis`** — [`generateDailyDatesFromExtent`](../frontend/src/components/MapView/Layers/ZarrLayer/stac.ts) produces one `DateItem` per UTC day from the STAC temporal extent.
- **`forecast`** — [`generateValidTimeDates`](../frontend/src/components/MapView/Layers/ZarrLayer/stac.ts) reads the latest `init_time` and `lead_time` coords from the open dataset and produces daily valid-time steps from init through init + max lead (~16 days).

Dates are fetched **lazily** when a Zarr layer is activated (not during the WMS preload pass at app startup).

## Supported today vs roadmap

The config schema intentionally exposes **only implemented values**, so everything below is a TODO rather than a selectable option. Each item is also marked with a `TODO` comment at the code boundary that would have to change.

Browse source collections at [stac.dynamical.org](https://stac.dynamical.org/catalog.json); each document declares `cube:variables` (names, units, dim layout), `cube:dimensions` (extents), and `assets.icechunk` (the repo S3 URI).

**Working today:** analysis cubes with a single `time` dim ([NOAA GFS](https://stac.dynamical.org/noaa-gfs-analysis/collection.json)), `init_time + lead_time` forecasts ([ECMWF AIFS Single](https://stac.dynamical.org/ecmwf-aifs-single-forecast/collection.json)), and ensemble forecasts rendered as the ensemble mean via `ensemble: true` ([ECMWF AIFS ENS](https://stac.dynamical.org/ecmwf-aifs-ens-forecast/collection.json), [ECMWF IFS ENS](https://stac.dynamical.org/ecmwf-ifs-ens-forecast-15-day-0-25-degree/collection.json)).

### Store axis (`store`)

- **Icechunk v2** — supported, via `IcechunkStore.open` in [`icechunk-store.ts`](../frontend/src/components/MapView/Layers/ZarrLayer/icechunk-store.ts).
- **Icechunk v1** — TODO: opener selection in `openZarrDataset`.
- **`http` (plain Zarr over HTTPS)** — TODO: opener selection (`zarr.FetchStore`), plus generalizing the `IcechunkStore` type params to `zarr.Readable` and replacing the `snapshotId` cache key, which only exists for versioned stores.

Any new store value also needs the STAC asset resolver to recognize non-Icechunk asset roles ([`stac.ts`](../frontend/src/components/MapView/Layers/ZarrLayer/stac.ts)).

### Metadata convention (no config field)

Plain CF cubes are supported today through the [shim](#geozarr-metadata-shim). Reading **native GeoZarr attrs** instead is a TODO: detect `spatial:*` / `proj:code` on the group and bypass the shim, which also removes the grid assumptions below.

This gets no config field and is never a `store` value: GeoZarr is a metadata convention that can appear in any store, and it is discoverable from the data.

### Data assumptions (independent of both axes)

These hold for dynamical.org's cubes but are not universal, and no configuration vocabulary fixes them:

- **Time units** — epoch-second `time` / `init_time` and second-based `lead_time` are assumed; CF `units` is never parsed. Other encodings ("hours since ...", nanosecond datetime64) snap to a wrong index **silently**. See `snapToNearestTimeIndex` in [`georef.ts`](../frontend/src/components/MapView/Layers/ZarrLayer/georef.ts).
- **Grid and CRS** — `EPSG:4326`, longitudes in `-180..180`, and regular spacing sampled from the first two coordinates. 0-360 longitudes, projected grids (e.g. Lambert conformal), and Gaussian grids are mis-georeferenced.
- **STAC requirement** — date discovery always needs a fetchable `stac_item`; dates cannot yet be derived from the cube's own `time` coordinate.
- **Bucket CORS** — chunks are read directly from the browser, so the host bucket must send CORS headers for the deployment origin.
- **Region** — `s3ToHttpsUrl` defaults to `us-west-2`; other regions need a `repo_url` override.
- **Other gaps** — regional-only grids without shim changes, derived quantities requiring U/V wind combination, and selectable model run (`init_time`) on the timeline (forecasts always use the latest run).

## UI parity with WMS and COG

- **Dates / timeline** — `zarr` is in `dateSupportLayerTypes`, handled by `isDateCompatibleLayer`, and has a `case 'zarr'` in `getPossibleDatesForLayer` / `getAvailableDatesForLayer`.
- **Mutual exclusivity** — `keepLayer` treats `wms`, `cog`, and `zarr` as one raster-hazard class (`RASTER_HAZARD_TYPES`).
- **Z-order** — `zarr` shares ordering rank `7` with `wms` and `cog` in [`mapStateSlice`](../frontend/src/context/mapStateSlice/index.ts); renders below admin boundaries via `beforeId`.
- **Opacity** — same Redux opacity path as COG/WMS; passed to `DeckZarrLayer`.
- **Data loading** — excluded from the Redux `loadLayerData` thunk; the component self-fetches STAC + opens Icechunk.

## Adding a new Zarr layer

1. **Explore STAC** — open [stac.dynamical.org](https://stac.dynamical.org/catalog.json), pick a collection, and note the **`variable`** name from `cube:variables`.
2. **Choose `time_layout`** — use `analysis` for a single `time` dim or `forecast` for `init_time + lead_time` cubes; set `ensemble: true` when the cube has an ensemble dimension. Leave `store` unset unless a second store protocol has been implemented.
3. **Add legend** — define breakpoints in [`frontend/src/config/shared/legends.json`](../frontend/src/config/shared/legends.json). Set `value_range` to match the GPU rescale domain (display units after CF scaling and optional `value_scale`).
4. **Add layer entry** — in shared or country `layers.json` (see forecast example above).
5. **Wire the menu** — reference the layer ID under a category in `prism.json`.
6. **Verify** — timeline appears; layer covers the visible map; pan/zoom loads tiles; date scrubbing updates the field; ENS layers show a smooth ensemble-mean field; switching to WMS/COG removes the Zarr layer.

## Key source files

| File | Role |
| --- | --- |
| [`ZarrLayer/index.tsx`](../frontend/src/components/MapView/Layers/ZarrLayer/index.tsx) | React component: STAC resolve → open dataset → register `DeckZarrLayer` |
| [`ZarrLayer/stac.ts`](../frontend/src/components/MapView/Layers/ZarrLayer/stac.ts) | STAC fetch, Icechunk href resolution, S3→HTTPS, daily date generation |
| [`ZarrLayer/icechunk-store.ts`](../frontend/src/components/MapView/Layers/ZarrLayer/icechunk-store.ts) | Open/pin Icechunk repo, read coords, forecast selection resolver |
| [`ZarrLayer/geozarr-shim.ts`](../frontend/src/components/MapView/Layers/ZarrLayer/geozarr-shim.ts) | Synthesize GeoZarr attrs for CF-style cubes |
| [`ZarrLayer/tile-handlers.ts`](../frontend/src/components/MapView/Layers/ZarrLayer/tile-handlers.ts) | Zarr-specific `getTileData` (including ensemble mean); delegates GPU path to shared pipeline |
| [`raster-gpu-pipeline.ts`](../frontend/src/components/MapView/Layers/raster-gpu-pipeline.ts) | Shared legend colormap + `renderTile` (also used by COG) |

## Dependencies

Rendering comes from `@developmentseed/deck.gl-zarr`, `geozarr`, and `deck.gl-raster`; reads come from `icechunk-js` (Icechunk v2 store) on top of `zarrita` (Zarr v3). Versions are in [`frontend/package.json`](../frontend/package.json).
