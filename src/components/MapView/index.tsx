import React, { ComponentType, createElement, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  CircularProgress,
  createStyles,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { countBy, pickBy } from 'lodash';
import moment from 'moment';
// map
import ReactMapboxGl from 'react-mapbox-gl';
import { Map } from 'mapbox-gl';
import MapTooltip from './MapTooltip';
import Legends from './Legends';
// layers
import {
  BoundaryLayer,
  PointDataLayer,
  ImpactLayer,
  NSOLayer,
  WMSLayer,
} from './Layers';

import {
  DiscriminateUnion,
  PointDataLayerProps,
  ImpactLayerProps,
  LayerType,
  WMSLayerProps,
} from '../../config/types';

import {
  getBoundaryLayerSingleton,
  LayerDefinitions,
} from '../../config/utils';

import DateSelector from './DateSelector';
import {
  isLoading,
  layersSelector,
} from '../../context/mapStateSlice/selectors';
import { setMap, addLayer } from '../../context/mapStateSlice';
import { addNotification } from '../../context/notificationStateSlice';
import { hidePopup } from '../../context/tooltipStateSlice';
import {
  availableDatesSelector,
  isLoading as areDatesLoading,
  loadAvailableDates,
} from '../../context/serverStateSlice';

import appConfig from '../../config/prism.json';
import { loadLayerData } from '../../context/layers/layer-data';
import Analyser from './Analyser';
import AnalysisLayer from './Layers/AnalysisLayer';

const MapboxMap = ReactMapboxGl({
  accessToken: process.env.REACT_APP_MAPBOX_TOKEN as string,
});

type LayerComponentsMap<U extends LayerType> = {
  [T in U['type']]: ComponentType<{ layer: DiscriminateUnion<U, 'type', T> }>;
};

const componentTypes: LayerComponentsMap<LayerType> = {
  boundary: BoundaryLayer,
  wms: WMSLayer,
  nso: NSOLayer,
  impact: ImpactLayer,
  point_data: PointDataLayer,
};

function MapView({ classes }: MapViewProps) {
  const selectedLayers = useSelector(layersSelector);
  const layersLoading = useSelector(isLoading);
  const datesLoading = useSelector(areDatesLoading);
  const dispatch = useDispatch();
  const serverAvailableDates = useSelector(availableDatesSelector);

  const loading = layersLoading || datesLoading;

  useEffect(() => {
    // initial load, need available dates and boundary layer
    const boundaryLayer = getBoundaryLayerSingleton();
    dispatch(loadAvailableDates());
    dispatch(addLayer(boundaryLayer));
    // we must load boundary layer here for two reasons
    // 1. Stop showing two loading screens on startup - Mapbox renders its children very late, so we can't rely on BoundaryLayer to load internally
    // 2. Prevent situations where a user can toggle a layer like NSO (depends on Boundaries) before Boundaries finish loading.
    dispatch(loadLayerData({ layer: boundaryLayer }));
  }, [dispatch]);

  useEffect(() => {
    // when we switch layers, close any active pop-ups
    dispatch(hidePopup());
  }, [dispatch, selectedLayers]);

  // calculate possible dates user can pick from the currently selected layers.
  // with useMemo we save on performance and only show the notification when layers selected amount changes, making it a useEffect too.
  const selectedLayerDates: number[] = useMemo(() => {
    const dateSupportLayerTypes: Array<LayerType['type']> = [
      'impact',
      'point_data',
      'wms',
    ];
    const layersWithDateSupport = selectedLayers.filter((layer): layer is
      | WMSLayerProps
      | ImpactLayerProps
      | PointDataLayerProps => dateSupportLayerTypes.includes(layer.type));
    if (layersWithDateSupport.length === 0) {
      return [];
    }

    /*
       takes all the dates possible for every layer and counts the amount of times each one is duplicated.
       if a date's duplicate amount is the same as the number of layers active, then this date is compatible with all layers selected.
    */
    const selectedLayerDatesDupCount = countBy(
      layersWithDateSupport
        // the 2 below eslint disables are justified as TS will strongly ensure undefined is never returned from map()
        // eslint-disable-next-line array-callback-return,consistent-return
        .map((layer): number[] => {
          // eslint-disable-next-line default-case
          switch (layer.type) {
            case 'wms':
              return serverAvailableDates[layer.serverLayerName];
            case 'impact':
              return serverAvailableDates[
                (LayerDefinitions[layer.hazardLayer] as WMSLayerProps)
                  .serverLayerName
              ];
            case 'point_data':
              return serverAvailableDates[layer.id];
          }
        })
        .filter(value => value) // null check
        .flat()
        .map(value => moment(value).format('YYYY-MM-DD')),
    );
    /*
      Only keep the dates which were duplicated the same amount of times as the amount of layers active...and convert back to array.
     */
    const ret = Object.keys(
      pickBy(
        selectedLayerDatesDupCount,
        dupTimes => dupTimes >= layersWithDateSupport.length,
      ),
      // convert back to number array after using YYYY-MM-DD strings in countBy
    ).map(dateString => moment.utc(dateString).set({ hour: 12 }).valueOf());
    if (ret.length === 0) {
      dispatch(
        addNotification({
          message: 'No dates overlap with the selected layers.',
          type: 'warning',
        }),
      );
    }

    return ret;
  }, [dispatch, selectedLayers, serverAvailableDates]);

  const {
    map: { latitude, longitude, zoom },
  } = appConfig;

  // Saves a reference to base MapboxGL Map object in case child layers need access beyond the React wrappers
  const saveMap = (map: Map) => dispatch(setMap(() => map));

  return (
    <div className={classes.container}>
      {loading && (
        <div className={classes.loading}>
          <CircularProgress size={100} />
        </div>
      )}
      <MapboxMap
        // eslint-disable-next-line react/style-prop-object
        style="mapbox://styles/eric-ovio/ckaoo00yp0woy1ipevzqnvwzi"
        onStyleLoad={saveMap}
        center={[longitude, latitude]}
        zoom={[zoom]}
        containerStyle={{
          height: '100%',
        }}
        onClick={() => {
          dispatch(hidePopup());
        }}
      >
        <>
          {selectedLayers.map(layer => {
            const component: ComponentType<{ layer: any }> =
              componentTypes[layer.type];
            return createElement(component, {
              key: layer.id,
              layer,
            });
          })}
        </>
        <AnalysisLayer />

        <MapTooltip />
      </MapboxMap>
      <DateSelector availableDates={selectedLayerDates} />
      <Legends layers={selectedLayers} />
      <Analyser />
    </div>
  );
}

const styles = () =>
  createStyles({
    container: {
      height: '100%',
      position: 'relative',
    },
    loading: {
      position: 'absolute',
      height: '100%',
      width: '100%',
      backgroundColor: 'black',
      opacity: 0.75,
      zIndex: 1,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

export interface MapViewProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(MapView);
