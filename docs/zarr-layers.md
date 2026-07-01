# Zarr layers (dynamical.org)

How PRISM renders **Zarr** layers from [dynamical.org](https://dynamical.org/) Icechunk repositories: how they differ from WMS and COG, the request/render pipeline, GeoZarr metadata synthesis, and configuration.

For user-facing configuration, see the `zarr` section in the main [README](../README.md). For the date model (reference date, validity, query date), see [dates.md](dates.md). For the shared GPU colormap pipeline used by both COG and Zarr layers, see [cog-layers.md](cog-layers.md#rendering-pipeline).

## What a Zarr layer is

A Zarr layer streams a cloud-optimized Zarr dataset from dynamical.org's [STAC catalog](https://stac.dynamical.org/catalog.json) and renders it **client-side** with [deck.gl](https://deck.gl/). The browser opens an [Icechunk](https://icechunk.io/) repository directly (via `icechunk-js` + `zarrita`), fetches only the Zarr chunks that intersect the **current map viewport**, and colorizes pixels on the GPU.

| Concern | WMS layer | COG layer | Zarr layer |
| --- | --- | --- | --- |
| Rendering | Map server returns PNG/JPEG tiles | Browser reads GeoTIFF bytes, colorizes on GPU | Browser reads Zarr chunks, colorizes on GPU |
| Map technology | MapLibre raster `Source` + `Layer` | deck.gl `COGLayer` | deck.gl `ZarrLayer` |
| Color ramp | Baked into server-side style | Built from layer `legend` on client | Same as COG (shared GPU pipeline) |
| Spatial coverage | Server tiles | Presigned URLs filtered to deployment `bbox` | **Live viewport** (pan/zoom loads new chunks) |
| Data discovery | WMS GetCapabilities | STAC → `/cog_presigned_url` API | STAC collection → Icechunk asset href |
| PRISM API | Optional | Required (`/cog_presigned_url`, `/cog_proxy`) | **None** — browser reads S3 over HTTPS |
| Date source | WMS / WCS server | WMS GetCapabilities (same as WMS name) | STAC temporal extent (daily timeline) |

Zarr layers are designed to **behave like WMS/COG layers** in the UI (date selection, opacity, mutual exclusivity, render below admin boundaries). See [UI parity](#ui-parity-with-wms-and-cog).

Currently two subtypes are implemented, both hosted as Icechunk v2 repositories on AWS Open Data:

- **`dynamical`** — analysis cubes with a single `time × latitude × longitude` layout (e.g. NOAA GFS analysis).
- **`dynamical_forecast`** — forecast cubes with `init_time + lead_time` (and optionally `ensemble_member`) declared explicitly in config.

## Configuration

Zarr layers are defined in per-country or shared `layers.json` with `type: "zarr"`. The TypeScript shape is `ZarrLayerProps` in [`frontend/src/config/types.ts`](../frontend/src/config/types.ts):

```ts
export class ZarrLayerProps extends CommonLayerProps {
  type: 'zarr' = 'zarr';
  subtype: 'dynamical' | 'dynamical_forecast' = 'dynamical';
  stacItem: string;           // dynamical STAC collection URL
  variable: string;           // Zarr array name, e.g. temperature_2m
  ensemble?: boolean;         // forecast ensemble; requires dynamical_forecast (renders ensemble mean)
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

Multiple layer entries can share the same `stac_item` (same Icechunk repo) with different `variable` names.

### Analysis layers (`subtype: dynamical`)

Snap the selected timeline date to the nearest index in the `time` coordinate array.

### Forecast layers (`subtype: dynamical_forecast`)

Forecast behavior is **declared in config**, not inferred from Zarr dims:

- **`init_time`** is always pinned to the **latest model run** (newest index).
- **`lead_time`** is chosen so `init_time + lead_time` best matches the selected timeline date (valid time).
- When **`ensemble: true`**, the full **`ensemble_member`** axis is read per tile and averaged client-side (ensemble mean over 51 members; NaN/`_FillValue` excluded).

Example forecast layer entry:

```json
"ecmwf_aifs_ens_t2m": {
  "title": "Temperature 2m (ECMWF AIFS ENS forecast, dynamical.org)",
  "type": "zarr",
  "subtype": "dynamical_forecast",
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

```mermaid
sequenceDiagram
  participant Cfg as layers.json
  participant Cmp as ZarrLayerComponent
  participant STAC as stac.dynamical.org
  participant IC as IcechunkStore
  participant S3 as AWS S3 HTTPS
  participant Deck as DeckZarrLayer

  Cfg->>Cmp: stacItem, variable, legend, valueRange
  Cmp->>STAC: GET collection.json
  STAC-->>Cmp: Icechunk asset href s3://...
  Cmp->>Cmp: s3ToHttpsUrl
  Cmp->>IC: open repo, pin snapshot
  IC->>S3: read zarr metadata + coords
  Cmp->>Cmp: buildGeoZarrMetadata lat/lon affine
  Note over Cmp: snap selectedDate to time index
  Cmp->>Deck: register DeckZarrLayer node, metadata, selection time
  loop per visible viewport tile
    Deck->>IC: zarr.get arr sliceSpec
    IC->>S3: HTTP range reads for chunk bytes
    S3-->>IC: chunk data
    IC-->>Deck: Float32 tile
    Deck->>Deck: GPU colormap pipeline
  end
```

1. **Resolve STAC** — [`fetchDynamicalStacMetadata`](../frontend/src/components/MapView/Layers/ZarrLayer/stac.ts) fetches the collection document, finds the `icechunk` (or "Icechunk v2 repository") asset, and converts `s3://` hrefs to anonymous HTTPS URLs (`https://{bucket}.s3.us-west-2.amazonaws.com/{prefix}/`).
2. **Open dataset** — [`openZarrDataset`](../frontend/src/components/MapView/Layers/ZarrLayer/icechunk-store.ts) opens the repo with `icechunk-js`, pins a snapshot, reads variable metadata and `time` / `latitude` / `longitude` coordinate arrays, and caches per `(repoUrl, variable)`.
3. **GeoZarr shim** — [`buildGeoZarrMetadata`](../frontend/src/components/MapView/Layers/ZarrLayer/geozarr-shim.ts) synthesizes `spatial:*` and `proj:code` attrs that dynamical's plain CF cubes lack, validated with `@developmentseed/geozarr`'s `parseGeoZarrMetadata`.
4. **Time selection** — for `dynamical`, snap the selected date to the nearest `time` index. For `dynamical_forecast`, pin latest `init_time` and nearest `lead_time` for valid time; when `ensemble: true`, leave `ensemble_member` unpinned (`null`) and reduce to the mean in [`tile-handlers.ts`](../frontend/src/components/MapView/Layers/ZarrLayer/tile-handlers.ts) ([`resolveForecastSelection`](../frontend/src/components/MapView/Layers/ZarrLayer/icechunk-store.ts)).
5. **Register deck.gl layer** — a single `DeckZarrLayer` is registered in [`DeckGLLayersContext`](../frontend/src/components/MapView/DeckGLLayersContext.tsx) and rendered via [`DeckGLOverlay`](../frontend/src/components/MapView/DeckGLOverlay.tsx) (`interleaved: true`, `beforeId` for z-order).

Unlike COG layers, there is **no presign or proxy step** — the Icechunk store reads S3 directly from the browser. dynamical.org buckets are on AWS Open Data and expose CORS for anonymous reads.

## Viewport tiling

`@developmentseed/deck.gl-zarr`'s `ZarrLayer` extends `RasterTileLayer`: it pairs the Zarr **native chunk grid** with deck.gl's tile layer so only chunks intersecting the **current deck viewport** are requested. Panning and zooming fetch new chunks; coverage is not limited to `appConfig.map.boundingBox` (unlike COG presign filtering).

For each visible tile the layer builds a `sliceSpec` (spatial dims bounded to the tile, `time` pinned from `selection`) and calls the app's `getTileData`, which runs `zarr.get(arr, sliceSpec)`.

## GeoZarr metadata shim

dynamical.org GFS analysis cubes are plain CF Zarr (`time`, `latitude`, `longitude` coordinate arrays) without GeoZarr convention attributes. deck.gl-zarr requires GeoZarr metadata to derive the tile pyramid, affine transform, and CRS.

The shim ([`geozarr-shim.ts`](../frontend/src/components/MapView/Layers/ZarrLayer/geozarr-shim.ts)) computes:

- **`spatial:dimensions`** — spatial (y, x) dim names only, e.g. `["latitude", "longitude"]` (non-spatial dims come from the zarr array and `selection`)
- **`spatial:transform`** — 6-parameter affine from lon/lat coordinate spacing (GFS: 0.25° grid, north-first latitude)
- **`spatial:shape`** — `[721, 1440]` (height × width)
- **`proj:code`** — `EPSG:4326`

These attrs are passed to `DeckZarrLayer` via the `metadata` prop (not written back to the store). If dynamical changes storage layout or adds native GeoZarr attrs, update this single module.

## Rendering pipeline

Pixel values become colors on the GPU using the same shared modules as COG layers ([`raster-gpu-pipeline.ts`](../frontend/src/components/MapView/Layers/raster-gpu-pipeline.ts) + [`raster-colormap.ts`](../frontend/src/components/MapView/Layers/raster-colormap.ts)):

1. **`getTileData`** (Zarr-specific) — `zarr.get` → coerce to `Float32` (ensemble mean when `ensemble: true`) → apply CF `scale_factor` / `add_offset` / optional `value_scale` → upload as `r32float` texture via `createLegendGpuPipeline().uploadTile`.
2. **`renderTile`** (shared) — `CreateTexture` → optional `FilterNoDataVal` (scaled `_FillValue`) → `LinearRescale` (`valueRange` or legend bounds) → `Colormap` (256×1 legend texture).

When the time index changes, the component re-registers the layer with `updateTriggers` on `getTileData` / `renderTile` so cached tiles are invalidated.

## Date discovery

Zarr layers do **not** use WMS GetCapabilities. Available dates depend on `subtype`:

- **`dynamical`** — [`generateDailyDatesFromExtent`](../frontend/src/components/MapView/Layers/ZarrLayer/stac.ts) produces one `DateItem` per UTC day from the STAC temporal extent.
- **`dynamical_forecast`** — [`generateValidTimeDates`](../frontend/src/components/MapView/Layers/ZarrLayer/stac.ts) reads the latest `init_time` and `lead_time` coords from the open dataset and produces daily valid-time steps from init through init + max lead (~16 days).

Dates are fetched **lazily** when a Zarr layer is activated (not during the WMS preload pass at app startup).

## dynamical.org STAC catalog

Browse collections at [stac.dynamical.org/catalog.json](https://stac.dynamical.org/catalog.json). Each collection document includes:

- **`cube:variables`** — variable names, units, and dimension layout
- **`cube:dimensions`** — spatial and temporal extents
- **`assets.icechunk`** — S3 URI for the Icechunk v2 repository

**Supported in PRISM:**

- **Analysis** — single `time` dimension + `latitude` / `longitude` (e.g. [NOAA GFS analysis](https://stac.dynamical.org/noaa-gfs-analysis/collection.json)).
- **Forecast** — `init_time + lead_time` with `subtype: dynamical_forecast` (e.g. [ECMWF AIFS Single forecast](https://stac.dynamical.org/ecmwf-aifs-single-forecast/collection.json)).
- **Forecast ensemble** — add `ensemble: true` for cubes with an `ensemble_member` dimension; PRISM renders the **ensemble mean** (e.g. [ECMWF AIFS ENS](https://stac.dynamical.org/ecmwf-aifs-ens-forecast/collection.json), [ECMWF IFS ENS](https://stac.dynamical.org/ecmwf-ifs-ens-forecast-15-day-0-25-degree/collection.json)).

**Not yet supported:** regional-only grids without GeoZarr shim changes, derived quantities requiring U/V wind combination, and selectable model run (`init_time`) on the timeline (forecasts always use the latest run).

## UI parity with WMS and COG

- **Dates / timeline** — `zarr` is in `dateSupportLayerTypes`, handled by `isDateCompatibleLayer`, and has a `case 'zarr'` in `getPossibleDatesForLayer` / `getAvailableDatesForLayer`.
- **Mutual exclusivity** — `keepLayer` treats `wms`, `cog`, and `zarr` as one raster-hazard class (`RASTER_HAZARD_TYPES`).
- **Z-order** — `zarr` shares ordering rank `7` with `wms` and `cog` in [`mapStateSlice`](../frontend/src/context/mapStateSlice/index.ts); renders below admin boundaries via `beforeId`.
- **Opacity** — same Redux opacity path as COG/WMS; passed to `DeckZarrLayer`.
- **Data loading** — excluded from the Redux `loadLayerData` thunk; the component self-fetches STAC + opens Icechunk.

## Adding a new dynamical Zarr layer

1. **Explore STAC** — open [stac.dynamical.org](https://stac.dynamical.org/catalog.json), pick a collection, and note the **`variable`** name from `cube:variables`.
2. **Choose subtype** — use `dynamical` for analysis (`time` dim) or `dynamical_forecast` for forecast cubes; set `ensemble: true` when the cube has an ensemble dimension.
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

Frontend packages (see [`frontend/package.json`](../frontend/package.json)):

- `@developmentseed/deck.gl-zarr` — viewport-tiled Zarr rendering
- `@developmentseed/geozarr` — GeoZarr metadata parsing
- `@developmentseed/deck.gl-raster` — GPU colormap modules
- `icechunk-js` — Icechunk v2 store for `zarrita`
- `zarrita` — Zarr v3 reads
