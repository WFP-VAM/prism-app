import type { GetTileDataOptions } from '@developmentseed/deck.gl-geotiff';
import { COGLayer as DeckCOGLayer } from '@developmentseed/deck.gl-geotiff';
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

    const deploymentBbox = appConfig.map.boundingBox as
      | [number, number, number, number]
      | undefined;

    getPresignedCogUrls(collection, dateString, band, deploymentBbox)
      .then((urls: PresignedCogUrl[]) => {
        if (!cancelled) {
          setFetchedData({ dateString, urls });
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error(`COGLayer [${id}]: failed to load presigned URLs`, err);
          setFetchedData(null);
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

    presignedUrls.forEach(({ item_id, url }) => {
      const deckLayerId = `cog-${id}-${item_id}`;
      deckLayerIds.push(deckLayerId);

      // TODO(cog-cors): Pass presigned `url` directly to `geotiff` once HDC bucket
      // CORS allows GET + Range from PRISM; drop COG_PROXY_API wrapper.
      const proxyUrl = `${COG_PROXY_API}?url=${encodeURIComponent(url)}`;

      registerRef.current(
        deckLayerId,
        new DeckCOGLayer<RasterTileData>({
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

    registeredIdsRef.current = deckLayerIds;

    return undefined;
  }, [
    id,
    presignedUrls,
    effectiveOpacity,
    before,
    currentLegendKey,
    registerRef,
  ]);

  return null;
});

export default COGLayerComponent;
