import type { Layer } from '@deck.gl/core';
import type { MinimalTileData } from '@developmentseed/deck.gl-raster';
import { ZarrLayer as DeckZarrLayer } from '@developmentseed/deck.gl-zarr';
import { useDeckGLRegistration } from 'components/MapView/Layers/useDeckGLRegistration';
import type { ZarrLayerProps } from 'config/types';
import { addNotification } from 'context/notificationStateSlice';
import { opacitySelector } from 'context/opacityStateSlice';
import { memo, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useDefaultDate } from 'utils/useDefaultDate';
import * as zarr from 'zarrita';

import {
  type OpenZarrDataset,
  openZarrDataset,
  type OpenZarrDatasetOptions,
  resolveForecastSelection,
  resolveTimeIndex,
} from './icechunk-store';
import { fetchDynamicalStacMetadata } from './stac';
import { createZarrTileHandlers } from './tile-handlers';

/**
 * deck.gl-raster's RasterTileLayer only forwards `updateTriggers.renderTile`
 * to its inner deck.gl TileLayer (as `renderSubLayers`), and drops
 * `updateTriggers.getTileData`. Without that trigger the TileLayer never resets
 * its tile cache, so changing `selection` (date / lead time)
 * re-renders the *cached* tiles instead of refetching — the map appears frozen.
 *
 * Re-inject `updateTriggers.getTileData` onto the inner TileLayer via `clone()`
 * so the cache is invalidated when our selection-based trigger changes.
 */
class PrismZarrLayer<
  Store extends zarr.Readable = zarr.Readable,
  Dtype extends zarr.DataType = zarr.DataType,
  DataT extends MinimalTileData = MinimalTileData,
> extends DeckZarrLayer<Store, Dtype, DataT> {
  static layerName = 'PrismZarrLayer';

  renderLayers(): Layer | null {
    const inner = super.renderLayers();
    if (!inner) {
      return inner;
    }
    const getTileDataTrigger = (
      this.props.updateTriggers as Record<string, unknown> | undefined
    )?.getTileData;
    return inner.clone({
      updateTriggers: {
        ...inner.props.updateTriggers,
        getTileData: getTileDataTrigger,
      },
    });
  }
}

export interface ZarrLayerComponentProps {
  layer: ZarrLayerProps;
  before?: string;
}

function toOpenOptions(layer: ZarrLayerProps): OpenZarrDatasetOptions {
  const isForecast = layer.subtype === 'dynamical_forecast';
  return {
    mode: isForecast ? 'forecast' : 'analysis',
    ensemble: isForecast ? layer.ensemble : false,
    initTimeDim: layer.initTimeDim,
    leadTimeDim: layer.leadTimeDim,
    ensembleDim: layer.ensembleDim,
  };
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
      valueScale = 1,
      subtype,
      ensemble,
    } = layer;

    const dispatch = useDispatch();
    const selectedDate = useDefaultDate(id);
    const opacityState = useSelector(opacitySelector(id));
    const effectiveOpacity = opacityState ?? opacity ?? 0.8;
    const reduceEnsemble =
      subtype === 'dynamical_forecast' && ensemble === true;

    const { registerRef, unregisterRef } = useDeckGLRegistration();
    const openOptions = useMemo(() => toOpenOptions(layer), [layer]);

    const [repoUrl, setRepoUrl] = useState<string | null>(
      repoUrlOverride ?? null,
    );
    const [dataset, setDataset] = useState<OpenZarrDataset | null>(null);

    const minValue = valueRange?.[0] ?? Number(legend?.[0]?.value ?? -40);
    const maxValue =
      valueRange?.[1] ?? Number(legend?.[legend.length - 1]?.value ?? 50);

    const selection = useMemo(() => {
      if (!dataset || selectedDate === undefined) {
        return undefined;
      }
      if (subtype === 'dynamical_forecast') {
        return resolveForecastSelection(dataset, selectedDate);
      }
      return { [dataset.timeDim]: resolveTimeIndex(dataset, selectedDate) };
    }, [dataset, selectedDate, subtype]);

    const tileHandlers = useMemo(
      () =>
        legend
          ? createZarrTileHandlers({
              legend,
              minValue,
              maxValue,
              scaleFactor: dataset?.meta.scaleFactor ?? 1,
              addOffset: dataset?.meta.addOffset ?? 0,
              valueScale,
              fillValue: dataset?.meta.fillValue,
              reduceEnsemble,
            })
          : null,
      [
        legend,
        minValue,
        maxValue,
        valueScale,
        reduceEnsemble,
        dataset?.meta.scaleFactor,
        dataset?.meta.addOffset,
        dataset?.meta.fillValue,
      ],
    );

    const selectionKey = useMemo(
      () => (selection ? JSON.stringify(selection) : undefined),
      [selection],
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

      openZarrDataset(repoUrl, variable, openOptions)
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
    }, [repoUrl, variable, openOptions, id, layer.title, dispatch]);

    // Effect B: register deck.gl-zarr ZarrLayer (viewport-tiled)
    useEffect(() => {
      const deckLayerId = `zarr-${id}`;

      if (!dataset || !selection || !tileHandlers || !legend) {
        unregisterRef.current(deckLayerId);
        return undefined;
      }

      registerRef.current(
        deckLayerId,
        new PrismZarrLayer({
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
            getTileData: [selectionKey, dataset.snapshotId, reduceEnsemble],
            renderTile: [selectionKey, minValue, maxValue, valueScale],
          },
        }),
      );

      return () => {
        unregisterRef.current(deckLayerId);
      };
    }, [
      dataset,
      selection,
      selectionKey,
      reduceEnsemble,
      tileHandlers,
      legend,
      effectiveOpacity,
      before,
      id,
      minValue,
      maxValue,
      valueScale,
    ]);

    return null;
  },
);

export default ZarrLayerComponent;
