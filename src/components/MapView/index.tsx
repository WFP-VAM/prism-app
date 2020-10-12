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
  ImpactLayer,
  NSOLayer,
  PointDataLayer,
  WMSLayer,
} from './Layers';

import { DiscriminateUnion, LayerType } from '../../config/types';

import { getBoundaryLayerSingleton } from '../../config/utils';

import DateSelector from './DateSelector';
import {
  dateRangeSelector,
  isLoading,
  layersSelector,
} from '../../context/mapStateSlice/selectors';
import { addLayer, setMap } from '../../context/mapStateSlice';
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
import {
  DateCompatibleLayer,
  getPossibleDatesForLayer,
} from '../../utils/server-utils';
import { addNotification } from '../../context/notificationStateSlice';

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

const dateSupportLayerTypes: Array<LayerType['type']> = [
  'impact',
  'point_data',
  'wms',
];

function MapView({ classes }: MapViewProps) {
  const selectedLayers = useSelector(layersSelector);

  const layersLoading = useSelector(isLoading);
  const datesLoading = useSelector(areDatesLoading);
  const loading = layersLoading || datesLoading;

  const dispatch = useDispatch();

  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const serverAvailableDates = useSelector(availableDatesSelector);
  const selectedLayersWithDateSupport = selectedLayers.filter(
    (layer): layer is DateCompatibleLayer =>
      dateSupportLayerTypes.includes(layer.type),
  );

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

  // calculate possible dates user can pick from the currently selected layers
  const selectedLayerDates: number[] = useMemo(() => {
    if (selectedLayersWithDateSupport.length === 0) {
      return [];
    }

    /*
       takes all the dates possible for every layer and counts the amount of times each one is duplicated.
       if a date's duplicate amount is the same as the number of layers active, then this date is compatible with all layers selected.
    */
    const selectedLayerDatesDupCount = countBy(
      selectedLayersWithDateSupport
        .map(layer => getPossibleDatesForLayer(layer, serverAvailableDates))
        .filter(value => value) // null check
        .flat()
        .map(value => moment(value).format('YYYY-MM-DD')),
    );
    /*
      Only keep the dates which were duplicated the same amount of times as the amount of layers active...and convert back to array.
     */
    return Object.keys(
      pickBy(
        selectedLayerDatesDupCount,
        dupTimes => dupTimes >= selectedLayersWithDateSupport.length,
      ),
      // convert back to number array after using YYYY-MM-DD strings in countBy
    ).map(dateString => moment.utc(dateString).set({ hour: 12 }).valueOf());
  }, [selectedLayersWithDateSupport, serverAvailableDates]);

  // close popups and show warning notifications
  useEffect(() => {
    // when we switch layers, or change dates, close any active pop-ups
    dispatch(hidePopup());

    // let users know if the layers selected are not possible to view together.
    if (
      selectedLayerDates.length === 0 &&
      selectedLayersWithDateSupport.length !== 0
    ) {
      dispatch(
        addNotification({
          message: 'No dates overlap with the selected layers.',
          type: 'warning',
        }),
      );
    }
    // let users know if their current date doesn't exist in possible dates
    if (selectedDate) {
      selectedLayersWithDateSupport.forEach(layer => {
        // we convert to date strings, so hh:ss is irrelevant
        if (
          !getPossibleDatesForLayer(layer, serverAvailableDates)
            .map(date => moment(date).format('YYYY-MM-DD'))
            .includes(moment(selectedDate).format('YYYY-MM-DD'))
        ) {
          dispatch(
            addNotification({
              message: `Selected Date isn't compatible with Layer: ${layer.title}`,
              type: 'warning',
            }),
          );
        }
      });
    }
  }, [
    dispatch,
    selectedDate,
    selectedLayerDates.length,
    selectedLayersWithDateSupport,
    serverAvailableDates,
  ]);

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
