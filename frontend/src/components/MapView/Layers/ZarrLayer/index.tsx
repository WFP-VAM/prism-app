import { ZarrLayer as DeckZarrLayer } from '@developmentseed/deck.gl-zarr';
import { useDeckGLRegistration } from 'components/MapView/Layers/useDeckGLRegistration';
import type { ZarrLayerProps } from 'config/types';
import { addNotification } from 'context/notificationStateSlice';
import { opacitySelector } from 'context/opacityStateSlice';
import { memo, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useDefaultDate } from 'utils/useDefaultDate';

import {
  type OpenZarrDataset,
  openZarrDataset,
  resolveTimeIndex,
} from './icechunk-store';
import { fetchDynamicalStacMetadata } from './stac';
import { createZarrTileHandlers } from './tile-handlers';

export interface ZarrLayerComponentProps {
  layer: ZarrLayerProps;
  before?: string;
}

const ZarrLayerComponent = memo(
  ({ layer, before }: ZarrLayerComponentProps) => {
    const {
      id,
      stacItem,
      variable,
      repoUrl: repoUrlOverride,
      opacity,
      legend,
      valueRange,
    } = layer;

    const dispatch = useDispatch();
    const selectedDate = useDefaultDate(id);
    const opacityState = useSelector(opacitySelector(id));
    const effectiveOpacity = opacityState ?? opacity ?? 0.8;

    const { registerRef, unregisterRef } = useDeckGLRegistration();

    const [repoUrl, setRepoUrl] = useState<string | null>(
      repoUrlOverride ?? null,
    );
    const [dataset, setDataset] = useState<OpenZarrDataset | null>(null);

    const minValue = valueRange?.[0] ?? Number(legend?.[0]?.value ?? -40);
    const maxValue =
      valueRange?.[1] ?? Number(legend?.[legend.length - 1]?.value ?? 50);

    const timeIndex = useMemo(() => {
      if (!dataset || selectedDate === undefined) {
        return undefined;
      }
      return resolveTimeIndex(dataset, selectedDate);
    }, [dataset, selectedDate]);

    const tileHandlers = useMemo(
      () =>
        legend
          ? createZarrTileHandlers({
              legend,
              minValue,
              maxValue,
              scaleFactor: dataset?.meta.scaleFactor ?? 1,
              addOffset: dataset?.meta.addOffset ?? 0,
              fillValue: dataset?.meta.fillValue,
            })
          : null,
      [
        legend,
        minValue,
        maxValue,
        dataset?.meta.scaleFactor,
        dataset?.meta.addOffset,
        dataset?.meta.fillValue,
      ],
    );

    // Effect A: resolve STAC → repo URL
    useEffect(() => {
      if (repoUrlOverride) {
        setRepoUrl(repoUrlOverride);
        return undefined;
      }

      let cancelled = false;

      fetchDynamicalStacMetadata(stacItem)
        .then(meta => {
          if (!cancelled) {
            setRepoUrl(meta.repoUrl);
          }
        })
        .catch(err => {
          if (!cancelled) {
            console.error(`ZarrLayer [${id}]: failed to resolve STAC`, err);
            setRepoUrl(null);
            dispatch(
              addNotification({
                message: `Failed to load Zarr layer "${layer.title}": ${err.message}`,
                type: 'warning',
              }),
            );
          }
        });

      return () => {
        cancelled = true;
      };
    }, [stacItem, repoUrlOverride, id, layer.title, dispatch]);

    // Effect A (cont.): open dataset once repo URL is known
    useEffect(() => {
      if (!repoUrl) {
        setDataset(null);
        return undefined;
      }

      let cancelled = false;

      openZarrDataset(repoUrl, variable)
        .then(opened => {
          if (!cancelled) {
            setDataset(opened);
          }
        })
        .catch(err => {
          if (!cancelled) {
            console.error(`ZarrLayer [${id}]: failed to open dataset`, err);
            setDataset(null);
            dispatch(
              addNotification({
                message: `Failed to open Zarr dataset for "${layer.title}": ${err.message}`,
                type: 'warning',
              }),
            );
          }
        });

      return () => {
        cancelled = true;
      };
    }, [repoUrl, variable, id, layer.title, dispatch]);

    // Effect B: register deck.gl-zarr ZarrLayer (viewport-tiled)
    useEffect(() => {
      const deckLayerId = `zarr-${id}`;

      if (!dataset || timeIndex === undefined || !tileHandlers || !legend) {
        unregisterRef.current(deckLayerId);
        return undefined;
      }

      const selection = { [dataset.timeDim]: timeIndex };

      registerRef.current(
        deckLayerId,
        new DeckZarrLayer({
          id: deckLayerId,
          node: dataset.varArray,
          metadata: dataset.geozarrMetadata,
          selection,
          getTileData: tileHandlers.getTileData,
          renderTile: tileHandlers.renderTile,
          opacity: effectiveOpacity,
          pickable: false,
          // @ts-expect-error beforeId is injected by @deck.gl/mapbox in interleaved mode
          beforeId: before,
          updateTriggers: {
            getTileData: [timeIndex, dataset.snapshotId],
            renderTile: [timeIndex, minValue, maxValue],
          },
        }),
      );

      return () => {
        unregisterRef.current(deckLayerId);
      };
    }, [
      dataset,
      timeIndex,
      tileHandlers,
      legend,
      effectiveOpacity,
      before,
      id,
      minValue,
      maxValue,
    ]);

    return null;
  },
);

export default ZarrLayerComponent;
