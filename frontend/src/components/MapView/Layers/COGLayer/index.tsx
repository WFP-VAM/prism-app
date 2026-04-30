import { memo, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import type { GetTileDataOptions } from '@developmentseed/deck.gl-geotiff';
import { COGLayer as DeckCOGLayer } from '@developmentseed/deck.gl-geotiff';
import type {
  RasterModule,
  RenderTileResult,
} from '@developmentseed/deck.gl-raster';
import {
  Colormap,
  CreateTexture,
  FilterNoDataVal,
  LinearRescale,
  createColormapTexture,
} from '@developmentseed/deck.gl-raster/gpu-modules';
import type { GeoTIFF, Overview } from '@developmentseed/geotiff';
import type { Texture } from '@luma.gl/core';
import type { CogLayerProps, LegendDefinition } from 'config/types';
import { appConfig } from 'config';
import { useDefaultDate } from 'utils/useDefaultDate';
import { getRequestDate } from 'utils/server-utils';
import { availableDatesSelector } from 'context/serverStateSlice';
import { opacitySelector } from 'context/opacityStateSlice';
import type { PresignedCogUrl } from 'components/MapView/Layers/raster-utils';
import { getPresignedCogUrls } from 'components/MapView/Layers/raster-utils';
import { useDeckGLLayers } from 'components/MapView/DeckGLLayersContext';
import { addNotification } from 'context/notificationStateSlice';
import { COG_PROXY_API } from 'utils/constants';

export interface COGLayerComponentProps {
  layer: CogLayerProps;
  before?: string;
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

    // Find the last legend entry whose value <= the pixel value
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

  const layerAvailableDates = serverAvailableDates[layer.serverLayerName];
  const queryDate = getRequestDate(layerAvailableDates, selectedDate);
  const dateString = selectedDate
    ? (queryDate ? new Date(queryDate) : new Date()).toISOString().slice(0, 10)
    : undefined;

  // Derive max value from the last legend entry
  const maxValue = legend?.length
    ? Number(legend[legend.length - 1].value)
    : 300;

  // Scale factor from wcsConfig (e.g. NDVI = 0.0001, rainfall = 1)
  const scale = wcsConfig?.scale ?? 1;

  // Stable ref for nodata — populated when GeoTIFF metadata loads
  const nodataRef = useRef<number | null>(null);

  // Stable ref for render config so closures stay current
  const renderConfigRef = useRef<COGRenderConfig>({
    legend,
    maxValue,
    scale,
    nodataRef,
  });
  renderConfigRef.current = { legend, maxValue, scale, nodataRef };

  // Stable tile handlers — recreated only when legend or scale changes
  const tileHandlersRef = useRef<ReturnType<typeof createTileHandlers> | null>(
    null,
  );
  const legendKeyRef = useRef<string>('');
  const currentLegendKey = `${legend?.map(l => l.color).join(',') ?? ''}:${scale}`;
  if (currentLegendKey !== legendKeyRef.current) {
    legendKeyRef.current = currentLegendKey;
    tileHandlersRef.current = createTileHandlers(renderConfigRef.current);
  }

  useEffect(() => {
    if (!dateString) {
      return undefined;
    }

    let cancelled = false;
    const registeredIds: string[] = [];

    const deploymentBbox = appConfig.map.boundingBox as
      | [number, number, number, number]
      | undefined;

    getPresignedCogUrls(collection, dateString, band, deploymentBbox)
      .then((presignedUrls: PresignedCogUrl[]) => {
        if (cancelled || !presignedUrls.length) {
          return;
        }

        const handlers = tileHandlersRef.current;
        if (!handlers) {
          return;
        }

        // NOTE: We render each COG as an individual DeckCOGLayer rather than
        // using MosaicLayer. MosaicLayer requires WGS84 bounding boxes to
        // determine which sources intersect the viewport, but the STAC catalog
        // for MODIS collections returns bbox in sinusoidal meters (not WGS84).
        // Since server-side bbox filtering (via the `bbox` query param on
        // /cog_presigned_url) already limits results to ~4 tiles for the
        // deployment region, viewport culling is unnecessary.
        //
        // To re-enable MosaicLayer in the future (e.g. for global deployments
        // with many tiles), convert the sinusoidal bbox to WGS84 on the API
        // using pyproj (already available via rasterio):
        //   from pyproj import Transformer
        //   t = Transformer.from_crs("ESRI:54008", "EPSG:4326", always_xy=True)
        //   min_lon, min_lat = t.transform(xmin, ymin)
        //   max_lon, max_lat = t.transform(xmax, ymax)
        // Then pass those WGS84 bboxes as MosaicSource.bbox values.
        presignedUrls.forEach(({ item_id, url }) => {
          const deckLayerId = `cog-${id}-${item_id}`;
          registeredIds.push(deckLayerId);

          const proxyUrl = `${COG_PROXY_API}?url=${encodeURIComponent(url)}`;

          registerRef.current(
            deckLayerId,
            new DeckCOGLayer<TileData>({
              id: deckLayerId,
              geotiff: proxyUrl,
              getTileData: handlers.getTileData,
              renderTile: handlers.renderTile,
              opacity: effectiveOpacity,
              onGeoTIFFLoad: geotiff => {
                nodataRef.current = geotiff.nodata;
              },
              // @ts-expect-error beforeId is injected by @deck.gl/mapbox in interleaved mode
              beforeId: before,
            }),
          );
        });
      })
      .catch(err => {
        if (!cancelled) {
          console.error(`COGLayer [${id}]: failed to load presigned URLs`, err);
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
      registeredIds.forEach(lid => unregisterRef.current(lid));
    };
  }, [
    id,
    collection,
    band,
    before,
    dateString,
    effectiveOpacity,
    dispatch,
    layer.title,
    currentLegendKey,
  ]);

  return null;
});

export default COGLayerComponent;
