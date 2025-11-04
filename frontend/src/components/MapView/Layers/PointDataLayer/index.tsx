import { memo, useEffect } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';
import { Point } from 'geojson';

import { useDispatch, useSelector } from 'react-redux';
import {
  MapEventWrapFunctionProps,
  PointDataLayerProps,
  PointDataLoader,
  PointLayerData,
} from 'config/types';
import {
  clearUserAuthGlobal,
  userAuthSelector,
  availableDatesSelector,
} from 'context/serverStateSlice';
import { LayerData, loadLayerData } from 'context/layers/layer-data';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import { addNotification } from 'context/notificationStateSlice';
import { useDefaultDate } from 'utils/useDefaultDate';
import { getRequestDate } from 'utils/server-utils';
import { useUrlHistory } from 'utils/url-utils';
import {
  circlePaint,
  fillPaintCategorical,
  fillPaintData,
} from 'components/MapView/Layers/styles';
import {
  setEWSParams,
  setGoogleFloodParams,
  clearDataset,
} from 'context/datasetStateSlice';
import { createEWSDatasetParams } from 'utils/ews-utils';
import { addPopupParams } from 'components/MapView/Layers/layer-utils';
import {
  FillLayerSpecification,
  MapLayerMouseEvent,
  SymbolLayerSpecification,
} from 'maplibre-gl';
import { findFeature, getLayerMapId, useMapCallback } from 'utils/map-utils';
import { getFormattedDate } from 'utils/date-utils';
import { geoToH3, h3ToGeoBoundary } from 'h3-js';
import { createGoogleFloodDatasetParams } from 'utils/google-flood-utils';
import { useMapState } from 'utils/useMapState';
import {
  IconShape,
  ensureSDFIconsLoaded,
} from 'components/MapView/Layers/icon-utils';

const onClick =
  ({ layer, dispatch, t }: MapEventWrapFunctionProps<PointDataLayerProps>) =>
  (evt: MapLayerMouseEvent) => {
    addPopupParams(layer, dispatch, evt, t, false);

    const layerId = getLayerMapId(layer.id);
    const feature = findFeature(layerId, evt);
    if (layer.loader === PointDataLoader.EWS) {
      dispatch(clearDataset());
      if (!feature?.properties) {
        return;
      }
      const ewsDatasetParams = createEWSDatasetParams(
        feature?.properties,
        layer.data,
      );
      dispatch(setEWSParams(ewsDatasetParams));
    }
    if (layer.loader === PointDataLoader.GOOGLE_FLOOD && layer.detailUrl) {
      dispatch(clearDataset());
      if (!feature?.properties) {
        return;
      }
      const googleFloodDatasetParams = createGoogleFloodDatasetParams(
        feature?.properties,
        layer.detailUrl,
        layer.featureInfoTitle,
      );
      dispatch(setGoogleFloodParams(googleFloodDatasetParams));
    }
  };

// Point Data, takes any GeoJSON of points and shows it.
const PointDataLayer = memo(({ layer, before }: LayersProps) => {
  const layerId = getLayerMapId(layer.id);

  const selectedDate = useDefaultDate(layer.id);
  const serverAvailableDates = useSelector(availableDatesSelector);
  const layerAvailableDates = serverAvailableDates[layer.id];
  const userAuth = useSelector(userAuthSelector);
  const {
    actions: { removeLayerData },
  } = useMapState();
  const map = useMapState()?.maplibreMap();

  useMapCallback('click', layerId, layer, onClick);

  // Ensure SDF icons are loaded (create if not in sprite)
  useEffect(() => {
    if (map) {
      ensureSDFIconsLoaded(map);
    }
  }, [map]);

  const queryDate = getRequestDate(layerAvailableDates, selectedDate);
  const validateLayerDate = !layer.dateUrl || queryDate;

  const layerData = useSelector(layerDataSelector(layer.id, queryDate)) as
    | LayerData<PointDataLayerProps>
    | undefined;
  const dispatch = useDispatch();
  const { updateHistory, removeKeyFromUrl, removeLayerFromUrl } =
    useUrlHistory();

  const { data } = layerData || {};

  useEffect(() => {
    if (layer.authRequired && !userAuth) {
      return;
    }

    if (!data && validateLayerDate) {
      dispatch(loadLayerData({ layer, date: queryDate, userAuth }));
    }
  }, [
    data,
    dispatch,
    userAuth,
    layer,
    queryDate,
    layerAvailableDates,
    validateLayerDate,
  ]);

  useEffect(() => {
    if (data && !data.features && layer.authRequired) {
      dispatch(
        addNotification({
          message: 'Invalid credentials',
          type: 'error',
        }),
      );

      removeLayerData(layer);
      dispatch(clearUserAuthGlobal());
      return;
    }

    if (
      data &&
      (data as PointLayerData).features?.length === 0 &&
      layer.authRequired
    ) {
      dispatch(
        addNotification({
          message: `Data not found for provided date: ${getFormattedDate(
            selectedDate,
            'default',
          )}`,
          type: 'warning',
        }),
      );
    }
  }, [
    dispatch,
    layer,
    data,
    selectedDate,
    userAuth,
    removeKeyFromUrl,
    removeLayerFromUrl,
    updateHistory,
    removeLayerData,
  ]);

  if (!data || !validateLayerDate) {
    return null;
  }

  if (layer.hexDisplay) {
    const finalFeatures =
      data &&
      data.features
        .map(feature => {
          const point = feature.geometry as Point;

          // Convert the point to a hexagon
          const hexagon = geoToH3(
            point.coordinates[1],
            point.coordinates[0],
            6.9, // resolution, adjust as needed
          );
          if (!feature?.properties?.F2023_an_1) {
            return null;
          }
          return {
            ...feature,
            geometry: {
              type: 'Polygon',
              coordinates: [h3ToGeoBoundary(hexagon, true)], // Convert the hexagon to a GeoJSON polygon
            },
          };
        })
        .filter(Boolean);

    const filteredData = {
      ...data,
      features: finalFeatures,
    };

    return (
      <Source type="geojson" data={filteredData}>
        <Layer
          id={getLayerMapId(layer.id)}
          type="fill"
          paint={fillPaintCategorical(layer)}
          beforeId={before}
        />
      </Source>
    );
  }

  if (layer.adminLevelDisplay) {
    return (
      <Source data={data} type="geojson">
        <Layer
          id={layerId}
          type="fill"
          paint={
            fillPaintData(
              layer,
              layer.dataField,
            ) as FillLayerSpecification['paint']
          }
        />
      </Source>
    );
  }

  // Use icons: 'point' (default), 'square', 'triangle', or 'diamond'
  // These support icon-color which will be applied from circlePaint
  const iconShape: IconShape = (layer.iconShape || 'point') as IconShape;

  return (
    <Source data={data} type="geojson">
      <Layer
        beforeId={before}
        id={layerId}
        type="symbol"
        layout={{
          'icon-image': iconShape,
          'icon-size': 1.5,
          'icon-allow-overlap': true,
        }}
        paint={circlePaint(layer) as SymbolLayerSpecification['paint']}
      />
    </Source>
  );
});

export interface LayersProps {
  layer: PointDataLayerProps;
  before?: string;
}

export default PointDataLayer;
