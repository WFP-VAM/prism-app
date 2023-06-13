import React, { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Layer, Feature, GeoJSONLayer } from 'react-mapbox-gl';
import {
  AdminLevelDataLayerProps,
  BoundaryLayerProps,
  LayerKey,
} from '../../../../config/types';
import {
  LayerData,
  loadLayerData,
} from '../../../../context/layers/layer-data';
import {
  layerDataSelector,
  mapSelector,
} from '../../../../context/mapStateSlice/selectors';
import { addLayer, removeLayer } from '../../../../context/mapStateSlice';
import { useDefaultDate } from '../../../../utils/useDefaultDate';
import { getBoundaryLayers, LayerDefinitions } from '../../../../config/utils';
import { addNotification } from '../../../../context/notificationStateSlice';
import {
  firstBoundaryOnView,
  isLayerOnView,
} from '../../../../utils/map-utils';
import { useSafeTranslation } from '../../../../i18n';
import { fillPaintData } from '../styles';
import { availableDatesSelector } from '../../../../context/serverStateSlice';
import { getRequestDate } from '../../../../utils/server-utils';
import { addPopupParams } from '../layer-utils';

function AdminLevelDataLayers({ layer }: { layer: AdminLevelDataLayerProps }) {
  const dispatch = useDispatch();
  const map = useSelector(mapSelector);
  const serverAvailableDates = useSelector(availableDatesSelector);

  const boundaryId = layer.boundary || firstBoundaryOnView(map);

  const selectedDate = useDefaultDate(layer.id);
  const layerAvailableDates = serverAvailableDates[layer.id];
  const queryDate = getRequestDate(layerAvailableDates, selectedDate);

  const layerData = useSelector(layerDataSelector(layer.id, queryDate)) as
    | LayerData<AdminLevelDataLayerProps>
    | undefined;
  const { data } = layerData || {};
  const { features } = data || {};
  const { t } = useSafeTranslation();

  useEffect(() => {
    // before loading layer check if it has unique boundary?
    const boundaryLayers = getBoundaryLayers();
    const boundaryLayer = LayerDefinitions[
      boundaryId as LayerKey
    ] as BoundaryLayerProps;

    if ('boundary' in layer) {
      if (Object.keys(LayerDefinitions).includes(boundaryId)) {
        boundaryLayers.map(l => dispatch(removeLayer(l)));
        dispatch(addLayer({ ...boundaryLayer, isPrimary: true }));

        // load unique boundary only once
        // to avoid double loading which proven to be performance issue
        if (!isLayerOnView(map, boundaryId)) {
          dispatch(loadLayerData({ layer: boundaryLayer }));
        }
      } else {
        dispatch(
          addNotification({
            message: `Invalid unique boundary: ${boundaryId} for ${layer.id}`,
            type: 'error',
          }),
        );
      }
    }
    if (!features) {
      dispatch(loadLayerData({ layer, date: queryDate }));
    }
  }, [dispatch, features, layer, queryDate, boundaryId, map]);

  const getFillPattern = useCallback((value: number | null) => {
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PGRlZnM+PHN0eWxlPi5jbHMtMSwuY2xzLTN7ZmlsbDpub25lO30uY2xzLTJ7Y2xpcC1wYXRoOnVybCgjY2xpcC1wYXRoKTt9LmNscy0ze3N0cm9rZTojMDIwMDAxO3N0cm9rZS1taXRlcmxpbWl0OjEwO3N0cm9rZS13aWR0aDoycHg7fS5jbHMtNHtmaWxsOnVybCgjXzE5LTJfYmxhY2tfZGlhZ29uYWwpO308L3N0eWxlPjxjbGlwUGF0aCBpZD0iY2xpcC1wYXRoIj48cmVjdCBpZD0iU1ZHSUQiIGNsYXNzPSJjbHMtMSIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiLz48L2NsaXBQYXRoPjxwYXR0ZXJuIGlkPSJfMTktMl9ibGFja19kaWFnb25hbCIgZGF0YS1uYW1lPSIxOS0yIGJsYWNrIGRpYWdvbmFsIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcGF0dGVyblRyYW5zZm9ybT0idHJhbnNsYXRlKC04Ni41OSAtMzAuODkpIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3QgY2xhc3M9ImNscy0xIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIvPjxnIGNsYXNzPSJjbHMtMiI+PGxpbmUgY2xhc3M9ImNscy0zIiB4MT0iMTUzLjAzIiB5MT0iNTMuMDMiIHgyPSI0Ni45NyIgeTI9Ii01My4wMyIvPjxsaW5lIGNsYXNzPSJjbHMtMyIgeDE9IjE0Ny40OCIgeTE9IjU4LjU5IiB4Mj0iNDEuNDEiIHkyPSItNDcuNDgiLz48bGluZSBjbGFzcz0iY2xzLTMiIHgxPSIxNDEuOTIiIHkxPSI2NC4xNCIgeDI9IjM1Ljg2IiB5Mj0iLTQxLjkyIi8+PGxpbmUgY2xhc3M9ImNscy0zIiB4MT0iMTM2LjM3IiB5MT0iNjkuNyIgeDI9IjMwLjMiIHkyPSItMzYuMzciLz48bGluZSBjbGFzcz0iY2xzLTMiIHgxPSIxMzAuODEiIHkxPSI3NS4yNiIgeDI9IjI0Ljc0IiB5Mj0iLTMwLjgxIi8+PGxpbmUgY2xhc3M9ImNscy0zIiB4MT0iMTI1LjI2IiB5MT0iODAuODEiIHgyPSIxOS4xOSIgeTI9Ii0yNS4yNiIvPjxsaW5lIGNsYXNzPSJjbHMtMyIgeDE9IjExOS43IiB5MT0iODYuMzciIHgyPSIxMy42MyIgeTI9Ii0xOS43Ii8+PGxpbmUgY2xhc3M9ImNscy0zIiB4MT0iMTE0LjE0IiB5MT0iOTEuOTIiIHgyPSI4LjA4IiB5Mj0iLTE0LjE0Ii8+PGxpbmUgY2xhc3M9ImNscy0zIiB4MT0iMTA4LjU5IiB5MT0iOTcuNDgiIHgyPSIyLjUyIiB5Mj0iLTguNTkiLz48bGluZSBjbGFzcz0iY2xzLTMiIHgxPSIxMDMuMDMiIHkxPSIxMDMuMDMiIHgyPSItMy4wMyIgeTI9Ii0zLjAzIi8+PGxpbmUgY2xhc3M9ImNscy0zIiB4MT0iOTcuNDgiIHkxPSIxMDguNTkiIHgyPSItOC41OSIgeTI9IjIuNTIiLz48bGluZSBjbGFzcz0iY2xzLTMiIHgxPSI5MS45MiIgeTE9IjExNC4xNCIgeDI9Ii0xNC4xNCIgeTI9IjguMDgiLz48bGluZSBjbGFzcz0iY2xzLTMiIHgxPSI4Ni4zNyIgeTE9IjExOS43IiB4Mj0iLTE5LjciIHkyPSIxMy42MyIvPjxsaW5lIGNsYXNzPSJjbHMtMyIgeDE9IjgwLjgxIiB5MT0iMTI1LjI2IiB4Mj0iLTI1LjI2IiB5Mj0iMTkuMTkiLz48bGluZSBjbGFzcz0iY2xzLTMiIHgxPSI3NS4yNiIgeTE9IjEzMC44MSIgeDI9Ii0zMC44MSIgeTI9IjI0Ljc0Ii8+PGxpbmUgY2xhc3M9ImNscy0zIiB4MT0iNjkuNyIgeTE9IjEzNi4zNyIgeDI9Ii0zNi4zNyIgeTI9IjMwLjMiLz48bGluZSBjbGFzcz0iY2xzLTMiIHgxPSI2NC4xNCIgeTE9IjE0MS45MiIgeDI9Ii00MS45MiIgeTI9IjM1Ljg2Ii8+PGxpbmUgY2xhc3M9ImNscy0zIiB4MT0iNTguNTkiIHkxPSIxNDcuNDgiIHgyPSItNDcuNDgiIHkyPSI0MS40MSIvPjxsaW5lIGNsYXNzPSJjbHMtMyIgeDE9IjUzLjAzIiB5MT0iMTUzLjAzIiB4Mj0iLTUzLjAzIiB5Mj0iNDYuOTciLz48L2c+PC9wYXR0ZXJuPjwvZGVmcz48dGl0bGU+QXNzZXQgODwvdGl0bGU+PGcgaWQ9IkxheWVyXzIiIGRhdGEtbmFtZT0iTGF5ZXIgMiI+PGcgaWQ9IkxheWVyXzEtMiIgZGF0YS1uYW1lPSJMYXllciAxIj48cmVjdCBjbGFzcz0iY2xzLTQiIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIi8+PC9nPjwvZz48L3N2Zz4KCg==';
  }, []);

  if (!features) {
    return null;
  }

  if (!isLayerOnView(map, boundaryId)) {
    return null;
  }

  console.log(features.features);

  console.log(map);

  return (
    <>
      <Layer
        id={`fill-pattern-layer-${layer.id}`}
        type="fill"
        paint={{
          'fill-pattern': ['get', 'fillPattern'],
        }}
      >
        {features.features.map(feature => {
          return (
            <Feature
              key={`${feature?.properties?.admin0Name}-${feature?.properties?.admin1Name}-${feature?.properties?.admin2Name}`}
              coordinates={(feature.geometry as any).coordinates?.[0]}
              properties={{
                fillPattern: getFillPattern(feature?.properties?.value),
              }}
            />
          );
        })}
      </Layer>
      <GeoJSONLayer
        before={`layer-${boundaryId}-line`}
        id={`layer-${layer.id}`}
        data={features}
        fillPaint={fillPaintData(layer)}
        fillOnClick={async (evt: any) => {
          addPopupParams(layer, dispatch, evt, t, true);
        }}
      />
    </>
  );
}

export default AdminLevelDataLayers;
