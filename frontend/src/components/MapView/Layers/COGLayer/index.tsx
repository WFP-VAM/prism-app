import type { Layer } from '@deck.gl/core';
import type { GetTileDataOptions } from '@developmentseed/deck.gl-geotiff';
import {
  COGLayer as DeckCOGLayer,
  type COGLayerProps as DeckCOGLayerProps,
} from '@developmentseed/deck.gl-geotiff';
import type {
  MinimalTileData,
  RasterModule,
  RenderTileResult,
} from '@developmentseed/deck.gl-raster';
import {
  Colormap,
  createColormapTexture,
  CreateTexture,
  FilterNoDataVal,
  LinearRescale,
} from '@developmentseed/deck.gl-raster/gpu-modules';
import type { GeoTIFF, Overview } from '@developmentseed/geotiff';
import type { Texture } from '@luma.gl/core';
import { useDeckGLLayers } from 'components/MapView/DeckGLLayersContext';
import type { PresignedCogUrl } from 'components/MapView/Layers/raster-utils';
import { getPresignedCogUrls } from 'components/MapView/Layers/raster-utils';
import { appConfig } from 'config';
import type { CogLayerProps, LegendDefinition } from 'config/types';
import {
  finishLayerLoading,
  startLayerLoading,
} from 'context/cogLayerLoadingStateSlice';
import { addNotification } from 'context/notificationStateSlice';
import { opacitySelector } from 'context/opacityStateSlice';
import { availableDatesSelector } from 'context/serverStateSlice';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { COG_PROXY_API } from 'utils/constants';
import { getRequestDate } from 'utils/server-utils';
import { useDefaultDate } from 'utils/useDefaultDate';

export interface COGLayerComponentProps {
  layer: CogLayerProps;
  before?: string;
}

type PrismCOGLayerExtraProps = {
  onViewportTilesLoaded?: () => void;
  onTileLoadFailed?: () => void;
  /** Hide when viewport zoom is above this (hand off to PMTiles vectors). */
  visibleMaxZoom?: number | null;
  visibleMinZoom?: number | null;
};

/**
 * RasterTileLayer does not forward TileLayer load callbacks or
 * visibleMin/MaxZoom to its inner TileLayer. Re-inject them via `clone()` so
 * the legend loading bar tracks tile fetch and the COG hides at the PMTiles
 * zoom threshold.
 */
class PrismCOGLayer<
  DataT extends MinimalTileData = MinimalTileData,
> extends DeckCOGLayer<DataT> {
  static layerName = 'PrismCOGLayer';

  renderLayers(): Layer | null {
    const inner = super.renderLayers();
    if (!inner) {
      return inner;
    }
    const {
      onViewportTilesLoaded,
      onTileLoadFailed,
      visibleMaxZoom,
      visibleMinZoom,
    } = this.props as DeckCOGLayerProps<DataT> & PrismCOGLayerExtraProps;
    return inner.clone({
      onViewportLoad: onViewportTilesLoaded,
      onTileError: () => {
        onTileLoadFailed?.();
      },
      // RasterTileLayer only forwards minZoom/maxZoom (overview caps) — not
      // deck.gl's visible*Zoom viewport gates. Pass them onto the TileLayer.
      ...(visibleMaxZoom != null ? { visibleMaxZoom } : {}),
      ...(visibleMinZoom != null ? { visibleMinZoom } : {}),
    } as Parameters<Layer['clone']>[0]);
  }
}

// --- Colormap helpers ---

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/**
 * Build a 256×1 RGBA ImageData from legend breakpoints.
 * Texel i maps to value = minValue + (i/255)*(maxValue-minValue).
 *
 * Default is discrete bins (last legend threshold ≤ value wins) — same as WMS
 * hazard classes. With `interpolate`, colors blend linearly between adjacent
 * stops (FTW density ramp).
 *
 * Values listed in `transparentValues` (e.g. 0 = no prediction) get alpha 0 so
 * empty cells stay clear even if GPU nodata discard misses them.
 */
function buildColormapImageData(
  legend: LegendDefinition,
  minValue: number,
  maxValue: number,
  transparentValues: number[] = [],
  interpolate = false,
): ImageData {
  const data = new Uint8ClampedArray(256 * 4);
  const range = maxValue - minValue;
  const transparentZero = transparentValues.includes(0);
  const stops = legend
    .map(item => ({
      value: Number(item.value),
      rgb: hexToRgb(item.color),
    }))
    .filter(s => !Number.isNaN(s.value))
    .sort((a, b) => a.value - b.value);

  for (let i = 0; i < 256; i++) {
    const value = minValue + (i / 255) * range;
    let r = 0;
    let g = 0;
    let b = 0;

    if (stops.length === 0) {
      // keep black
    } else if (!interpolate || stops.length === 1) {
      let color = stops[0]!.rgb;
      for (let j = stops.length - 1; j >= 0; j--) {
        if (value >= stops[j]!.value) {
          color = stops[j]!.rgb;
          break;
        }
      }
      [r, g, b] = color;
    } else if (value <= stops[0]!.value) {
      [r, g, b] = stops[0]!.rgb;
    } else if (value >= stops[stops.length - 1]!.value) {
      [r, g, b] = stops[stops.length - 1]!.rgb;
    } else {
      let hi = 1;
      while (hi < stops.length && value > stops[hi]!.value) {
        hi += 1;
      }
      const lo = hi - 1;
      const loStop = stops[lo]!;
      const hiStop = stops[hi]!;
      const t =
        (value - loStop.value) / Math.max(hiStop.value - loStop.value, 1e-6);
      r = Math.round(loStop.rgb[0] + t * (hiStop.rgb[0] - loStop.rgb[0]));
      g = Math.round(loStop.rgb[1] + t * (hiStop.rgb[1] - loStop.rgb[1]));
      b = Math.round(loStop.rgb[2] + t * (hiStop.rgb[2] - loStop.rgb[2]));
    }

    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    // Match FTW: band <= 0 is transparent when 0 is configured as nodata.
    data[i * 4 + 3] = transparentZero && value <= 0 ? 0 : 255;
  }

  return new ImageData(data, 256, 1);
}

// --- Tile data types ---

type TileData = {
  height: number;
  width: number;
  texture: Texture;
  byteLength: number;
};

// --- Factory for per-layer getTileData / renderTile closures ---

interface COGRenderConfig {
  legend: LegendDefinition;
  minValue: number;
  maxValue: number;
  scale: number;
  offset: number;
  /** Pixel values to discard (transparent). Matches FTW `band <= 0` + uint8 nodata. */
  nodataRef: { current: number[] };
  /** Linear blend between legend stops (continuous ramps). Default is discrete bins. */
  interpolate: boolean;
}

function createTileHandlers(config: COGRenderConfig) {
  let colormapTex: Texture | null = null;

  const getTileData = async (
    image: GeoTIFF | Overview,
    options: GetTileDataOptions,
  ): Promise<TileData> => {
    const { device, x, y, signal, pool } = options;
    const tile = await image.fetchTile(x, y, {
      signal,
      pool,
      boundless: false,
    });
    const { array } = tile;

    if (array.layout === 'band-separate') {
      throw new Error('Expected pixel-interleaved layout');
    }

    const { width, height, data } = array;

    // Convert Int16 (or any integer type) to Float32 for GPU compatibility,
    // applying the wcsConfig affine transform (value * scale + offset) so
    // rendered values match the rest of the app (e.g. NDVI uses scale 0.0001,
    // temperature layers use offset -273 for Kelvin -> Celsius).
    //
    // FilterNoDataVal uses a fixed shader module name ("nodata"), so only ONE
    // instance can be in the pipeline. Collapse every configured nodata
    // sentinel onto the primary value before upload.
    const floatData = new Float32Array(data.length);
    const { scale, offset } = config;
    const nodataValues = config.nodataRef.current;
    const nodataSet = new Set(nodataValues);
    const primaryNodata = nodataValues[0];
    for (let i = 0; i < data.length; i++) {
      const raw = data[i]!;
      const v = nodataSet.has(raw) ? (primaryNodata ?? raw) : raw;
      floatData[i] = v * scale + offset;
    }

    const texture = device.createTexture({
      data: floatData,
      format: 'r32float',
      width,
      height,
      sampler: { minFilter: 'nearest', magFilter: 'nearest' },
    });

    // Lazily create the colormap texture on first tile load
    if (!colormapTex) {
      colormapTex = createColormapTexture(
        device,
        buildColormapImageData(
          config.legend,
          config.minValue,
          config.maxValue,
          config.nodataRef.current,
          config.interpolate,
        ),
      );
    }

    return { texture, width, height, byteLength: floatData.byteLength };
  };

  const renderTile = (tileData: TileData): RenderTileResult => {
    // FilterNoDataVal's module name is always "nodata" — duplicate instances
    // overwrite each other's uniforms. Use a single filter on the primary
    // sentinel (extras already collapsed in getTileData).
    const primaryNodata = config.nodataRef.current[0];
    const nodataFilters =
      primaryNodata !== undefined
        ? [
            {
              module: FilterNoDataVal,
              props: {
                value: primaryNodata * config.scale + config.offset,
              },
            },
          ]
        : [];
    const pipeline: RasterModule[] = [
      { module: CreateTexture, props: { textureName: tileData.texture } },
      ...nodataFilters,
      {
        module: LinearRescale,
        props: { rescaleMin: config.minValue, rescaleMax: config.maxValue },
      },
      ...(colormapTex
        ? [
            {
              module: Colormap,
              props: { colormapTexture: colormapTex, colormapIndex: 0 },
            },
          ]
        : []),
    ];
    return { renderPipeline: pipeline };
  };

  return { getTileData, renderTile };
}

// --- React component ---

const STATIC_PATH_DATE_KEY = 'static';

const COGLayerComponent = memo(({ layer, before }: COGLayerComponentProps) => {
  const {
    id,
    collection,
    band,
    opacity,
    legend,
    wcsConfig,
    path,
    maxZoom,
    minZoom,
  } = layer;

  const dispatch = useDispatch();
  const selectedDate = useDefaultDate(id);
  const serverAvailableDates = useSelector(availableDatesSelector);
  // activateAll groups: opacity slider targets the main layer id.
  const opacityLayerId = layer.group?.activateAll
    ? (layer.group.layers.find(l => l.main)?.id ?? id)
    : id;
  const opacityState = useSelector(opacitySelector(opacityLayerId));

  const { registerLayer, unregisterLayer } = useDeckGLLayers();
  const registerRef = useRef(registerLayer);
  const unregisterRef = useRef(unregisterLayer);
  registerRef.current = registerLayer;
  unregisterRef.current = unregisterLayer;

  const effectiveOpacity = opacityState ?? opacity;

  const layerAvailableDates = serverAvailableDates[id];
  const queryDate = getRequestDate(layerAvailableDates, selectedDate);
  const dateString = path
    ? STATIC_PATH_DATE_KEY
    : selectedDate
      ? (queryDate ? new Date(queryDate) : new Date())
          .toISOString()
          .slice(0, 10)
      : undefined;

  const [fetchedData, setFetchedData] = useState<{
    dateString: string;
    urls: PresignedCogUrl[];
  } | null>(null);
  const registeredIdsRef = useRef<string[]>([]);
  const pendingItemsRef = useRef<Set<string>>(new Set());
  const pendingUrlsKeyRef = useRef<string>('');
  const markItemCompleteRef = useRef<(itemId: string) => void>(() => {});
  markItemCompleteRef.current = (itemId: string) => {
    pendingItemsRef.current.delete(itemId);
    if (pendingItemsRef.current.size === 0) {
      dispatch(finishLayerLoading(id));
    }
  };
  const presignedUrls = useMemo(
    () =>
      fetchedData !== null && fetchedData.dateString === dateString
        ? fetchedData.urls
        : [],
    [fetchedData, dateString],
  );

  // Value domain from the sorted legend breakpoints; a non-zero min lets
  // negative-valued legends (e.g. SPI) render instead of clamping below 0.
  const rawMax = legend?.length ? Number(legend[legend.length - 1].value) : 300;
  const rawMin = legend?.length ? Number(legend[0].value) : 0;
  // Guard against a degenerate/inverted range (divide-by-zero in rescale).
  const minValue = Math.min(rawMin, rawMax);
  const maxValue = rawMax > rawMin ? rawMax : rawMin + 1;

  const scale = wcsConfig?.scale ?? 1;
  const offset = wcsConfig?.offset ?? 0;
  const interpolate = wcsConfig?.interpolate ?? false;
  const nodataFromConfig =
    wcsConfig?.noData === undefined
      ? []
      : Array.isArray(wcsConfig.noData)
        ? wcsConfig.noData
        : [wcsConfig.noData];
  const nodataRef = useRef<number[]>(nodataFromConfig);
  // Keep in sync if config changes without remounting.
  nodataRef.current =
    nodataFromConfig.length > 0 ? nodataFromConfig : nodataRef.current;
  const renderConfigRef = useRef<COGRenderConfig>({
    legend,
    minValue,
    maxValue,
    scale,
    offset,
    nodataRef,
    interpolate,
  });
  renderConfigRef.current = {
    legend,
    minValue,
    maxValue,
    scale,
    offset,
    nodataRef,
    interpolate,
  };

  const tileHandlersRef = useRef<ReturnType<typeof createTileHandlers> | null>(
    null,
  );
  const legendKeyRef = useRef<string>('');
  const currentLegendKey = `${legend?.map(l => `${l.value}:${l.color}`).join(',') ?? ''}:${scale}:${offset}:${interpolate}`;
  if (currentLegendKey !== legendKeyRef.current) {
    legendKeyRef.current = currentLegendKey;
    tileHandlersRef.current = createTileHandlers(renderConfigRef.current);
  }

  // Effect A: direct public path, or STAC presigned URLs when date/collection changes.
  useEffect(() => {
    if (path) {
      dispatch(startLayerLoading(id));
      setFetchedData({
        dateString: STATIC_PATH_DATE_KEY,
        urls: [{ item_id: 'direct', url: path }],
      });
      return () => {
        registeredIdsRef.current.forEach(lid => unregisterRef.current(lid));
        registeredIdsRef.current = [];
        pendingItemsRef.current = new Set();
        pendingUrlsKeyRef.current = '';
        dispatch(finishLayerLoading(id));
        setFetchedData(null);
      };
    }

    if (!dateString || !collection) {
      setFetchedData(null);
      return undefined;
    }

    let cancelled = false;

    dispatch(startLayerLoading(id));

    const deploymentBbox = appConfig.map.boundingBox as
      | [number, number, number, number]
      | undefined;

    getPresignedCogUrls(collection, dateString, band, deploymentBbox)
      .then((urls: PresignedCogUrl[]) => {
        if (!cancelled) {
          setFetchedData({ dateString, urls });
          if (urls.length === 0) {
            dispatch(finishLayerLoading(id));
          }
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error(`COGLayer [${id}]: failed to load presigned URLs`, err);
          setFetchedData(null);
          dispatch(finishLayerLoading(id));
          dispatch(
            addNotification({
              message: `Failed to load COG layer "${layer.title}": ${err.message}`,
              type: 'warning',
            }),
          );
        }
      });

    return () => {
      cancelled = true;
      registeredIdsRef.current.forEach(lid => unregisterRef.current(lid));
      registeredIdsRef.current = [];
      pendingItemsRef.current = new Set();
      pendingUrlsKeyRef.current = '';
      dispatch(finishLayerLoading(id));
      setFetchedData(null);
    };
  }, [id, collection, band, dateString, dispatch, layer.title, path]);

  // Effect B: register/update deck layers when urls, opacity, or z-order change.
  useEffect(() => {
    if (!presignedUrls.length) {
      return undefined;
    }

    const handlers = tileHandlersRef.current;
    if (!handlers) {
      return undefined;
    }

    const deckLayerIds: string[] = [];
    const urlsKey = `${dateString ?? ''}:${presignedUrls
      .map(u => u.item_id)
      .join(',')}`;
    if (pendingUrlsKeyRef.current !== urlsKey) {
      pendingUrlsKeyRef.current = urlsKey;
      pendingItemsRef.current = new Set(presignedUrls.map(u => u.item_id));
    }

    presignedUrls.forEach(({ item_id, url }) => {
      const deckLayerId = `cog-${id}-${item_id}`;
      deckLayerIds.push(deckLayerId);

      // Public path COGs (e.g. Source Cooperative) already send CORS; HDC
      // STAC assets still need the API proxy until bucket CORS is fixed.
      const geotiff = path
        ? url
        : `${COG_PROXY_API}?url=${encodeURIComponent(url)}`;

      registerRef.current(
        deckLayerId,
        new PrismCOGLayer<TileData>({
          id: deckLayerId,
          geotiff,
          getTileData: handlers.getTileData,
          renderTile: handlers.renderTile,
          opacity: effectiveOpacity,
          ...(maxZoom != null ? { visibleMaxZoom: maxZoom } : {}),
          ...(minZoom != null ? { visibleMinZoom: minZoom } : {}),
          onGeoTIFFLoad: (geotiffMeta: GeoTIFF) => {
            // Config wins (set above). Else fall back to GeoTIFF metadata.
            if (nodataFromConfig.length > 0) {
              return;
            }
            if (geotiffMeta.nodata != null) {
              nodataRef.current = [geotiffMeta.nodata];
            }
          },
          onViewportTilesLoaded: () => markItemCompleteRef.current(item_id),
          onTileLoadFailed: () => markItemCompleteRef.current(item_id),
          beforeId: before,
        } as DeckCOGLayerProps<TileData> & PrismCOGLayerExtraProps),
      );
    });

    registeredIdsRef.current = deckLayerIds;

    return undefined;
  }, [
    id,
    path,
    maxZoom,
    minZoom,
    presignedUrls,
    dateString,
    effectiveOpacity,
    before,
    currentLegendKey,
    dispatch,
  ]);

  return null;
});

export default COGLayerComponent;
