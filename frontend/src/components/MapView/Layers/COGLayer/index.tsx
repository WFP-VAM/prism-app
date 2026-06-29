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
};

/**
 * RasterTileLayer does not forward TileLayer load callbacks. Re-inject
 * `onViewportLoad` / `onTileError` on the inner TileLayer via `clone()` so the
 * legend loading bar can track COG tile fetch + render completion.
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
    const { onViewportTilesLoaded, onTileLoadFailed } = this
      .props as DeckCOGLayerProps<DataT> & PrismCOGLayerExtraProps;
    return inner.clone({
      onViewportLoad: onViewportTilesLoaded,
      onTileError: () => {
        onTileLoadFailed?.();
      },
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
 * Each texel i maps to value = (i/255)*maxValue; we find the legend bin
 * whose threshold is <= that value and assign its color.
 */
function buildColormapImageData(
  legend: LegendDefinition,
  maxValue: number,
): ImageData {
  const data = new Uint8ClampedArray(256 * 4);

  for (let i = 0; i < 256; i++) {
    const value = (i / 255) * maxValue;

    let colorHex = legend[0]?.color ?? '#000000';
    for (let j = legend.length - 1; j >= 0; j--) {
      const threshold = Number(legend[j].value);
      if (value >= threshold) {
        colorHex = legend[j].color;
        break;
      }
    }

    const [r, g, b] = hexToRgb(colorHex);
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
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
  maxValue: number;
  scale: number;
  nodataRef: { current: number | null };
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
    // applying the wcsConfig scale factor if present (e.g. NDVI uses 0.0001).
    const floatData = new Float32Array(data.length);
    const scale = config.scale;
    for (let i = 0; i < data.length; i++) {
      floatData[i] = data[i]! * scale;
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
        buildColormapImageData(config.legend, config.maxValue),
      );
    }

    return { texture, width, height, byteLength: floatData.byteLength };
  };

  const renderTile = (tileData: TileData): RenderTileResult => {
    const nodata = config.nodataRef.current;
    // When a scale factor is applied, nodata must also be scaled for comparison.
    const scaledNodata = nodata !== null ? nodata * config.scale : null;
    const pipeline: RasterModule[] = [
      { module: CreateTexture, props: { textureName: tileData.texture } },
      ...(scaledNodata !== null
        ? [{ module: FilterNoDataVal, props: { value: scaledNodata } }]
        : []),
      {
        module: LinearRescale,
        props: { rescaleMin: 0, rescaleMax: config.maxValue },
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

const COGLayerComponent = memo(({ layer, before }: COGLayerComponentProps) => {
  const { id, collection, band, opacity, legend, wcsConfig } = layer;

  const dispatch = useDispatch();
  const selectedDate = useDefaultDate(id);
  const serverAvailableDates = useSelector(availableDatesSelector);
  const opacityState = useSelector(opacitySelector(id));

  const { registerLayer, unregisterLayer } = useDeckGLLayers();
  const registerRef = useRef(registerLayer);
  const unregisterRef = useRef(unregisterLayer);
  registerRef.current = registerLayer;
  unregisterRef.current = unregisterLayer;

  const effectiveOpacity = opacityState ?? opacity;

  const layerAvailableDates = serverAvailableDates[id];
  const queryDate = getRequestDate(layerAvailableDates, selectedDate);
  const dateString = selectedDate
    ? (queryDate ? new Date(queryDate) : new Date()).toISOString().slice(0, 10)
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

  // Derive max value from the last legend entry
  const maxValue = legend?.length
    ? Number(legend[legend.length - 1].value)
    : 300;

  const scale = wcsConfig?.scale ?? 1;
  const nodataRef = useRef<number | null>(null);
  const renderConfigRef = useRef<COGRenderConfig>({
    legend,
    maxValue,
    scale,
    nodataRef,
  });
  renderConfigRef.current = { legend, maxValue, scale, nodataRef };

  const tileHandlersRef = useRef<ReturnType<typeof createTileHandlers> | null>(
    null,
  );
  const legendKeyRef = useRef<string>('');
  const currentLegendKey = `${legend?.map(l => l.color).join(',') ?? ''}:${scale}`;
  if (currentLegendKey !== legendKeyRef.current) {
    legendKeyRef.current = currentLegendKey;
    tileHandlersRef.current = createTileHandlers(renderConfigRef.current);
  }

  // Effect A: fetch presigned URLs when date/collection changes only.
  useEffect(() => {
    if (!dateString) {
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
  }, [id, collection, band, dateString, dispatch, layer.title]);

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

      // TODO(cog-cors): Pass presigned `url` directly to `geotiff` once HDC bucket
      // CORS allows GET + Range from PRISM; drop COG_PROXY_API wrapper.
      const proxyUrl = `${COG_PROXY_API}?url=${encodeURIComponent(url)}`;

      registerRef.current(
        deckLayerId,
        new PrismCOGLayer<TileData>({
          id: deckLayerId,
          geotiff: proxyUrl,
          getTileData: handlers.getTileData,
          renderTile: handlers.renderTile,
          opacity: effectiveOpacity,
          onGeoTIFFLoad: (geotiff: GeoTIFF) => {
            nodataRef.current = geotiff.nodata;
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
