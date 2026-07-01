import type { Layer } from '@deck.gl/core';
import type { GetTileDataOptions } from '@developmentseed/deck.gl-geotiff';
import {
  COGLayer as DeckCOGLayer,
  type COGLayerProps as DeckCOGLayerProps,
} from '@developmentseed/deck.gl-geotiff';
import type { MinimalTileData } from '@developmentseed/deck.gl-raster';
import type { GeoTIFF, Overview } from '@developmentseed/geotiff';
import {
  createLegendGpuPipeline,
  type RasterTileData,
} from 'components/MapView/Layers/raster-gpu-pipeline';
import type { PresignedCogUrl } from 'components/MapView/Layers/raster-utils';
import { getPresignedCogUrls } from 'components/MapView/Layers/raster-utils';
import { useDeckGLRegistration } from 'components/MapView/Layers/useDeckGLRegistration';
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

interface CogRenderConfig {
  legend: LegendDefinition;
  maxValue: number;
  scale: number;
  nodataRef: { current: number | null };
}

function createCogTileHandlers(config: CogRenderConfig) {
  const pipeline = createLegendGpuPipeline({
    legend: config.legend,
    minValue: 0,
    maxValue: config.maxValue,
    getNodata: () => {
      const nodata = config.nodataRef.current;
      return nodata !== null ? nodata * config.scale : null;
    },
  });

  const getTileData = async (
    image: GeoTIFF | Overview,
    options: GetTileDataOptions,
  ): Promise<RasterTileData> => {
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

    const floatData = new Float32Array(data.length);
    const scale = config.scale;
    for (let i = 0; i < data.length; i++) {
      floatData[i] = data[i]! * scale;
    }

    return pipeline.uploadTile(device, floatData, width, height);
  };

  return { getTileData, renderTile: pipeline.renderTile };
}

const COGLayerComponent = memo(({ layer, before }: COGLayerComponentProps) => {
  const { id, collection, band, opacity, legend, wcsConfig } = layer;

  const dispatch = useDispatch();
  const selectedDate = useDefaultDate(id);
  const serverAvailableDates = useSelector(availableDatesSelector);
  const opacityState = useSelector(opacitySelector(id));

  const { registerRef, unregisterRef } = useDeckGLRegistration();

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

  const maxValue = legend?.length
    ? Number(legend[legend.length - 1].value)
    : 300;

  const scale = wcsConfig?.scale ?? 1;
  const nodataRef = useRef<number | null>(null);
  const renderConfigRef = useRef<CogRenderConfig>({
    legend,
    maxValue,
    scale,
    nodataRef,
  });
  renderConfigRef.current = { legend, maxValue, scale, nodataRef };

  const tileHandlersRef = useRef<ReturnType<
    typeof createCogTileHandlers
  > | null>(null);
  const legendKeyRef = useRef<string>('');
  const currentLegendKey = `${legend?.map(l => l.color).join(',') ?? ''}:${scale}`;
  if (currentLegendKey !== legendKeyRef.current) {
    legendKeyRef.current = currentLegendKey;
    tileHandlersRef.current = createCogTileHandlers(renderConfigRef.current);
  }

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
  }, [id, collection, band, dateString, dispatch, layer.title, unregisterRef]);

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
        new PrismCOGLayer<RasterTileData>({
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
        } as DeckCOGLayerProps<RasterTileData> & PrismCOGLayerExtraProps),
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
    registerRef,
  ]);

  return null;
});

export default COGLayerComponent;
