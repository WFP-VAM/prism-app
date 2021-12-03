import React, {
  ComponentType,
  createElement,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  CircularProgress,
  createStyles,
  Grid,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { countBy, pickBy } from 'lodash';
import moment from 'moment';
// map
import ReactMapboxGl from 'react-mapbox-gl';
import DatePicker from 'react-datepicker';
import { Map } from 'mapbox-gl';
import bbox from '@turf/bbox';
import MapTooltip from './MapTooltip';
import Legends from './Legends';
import Download from './Download';
import BoundarySelector from './BoundarySelector';
// layers
import {
  BoundaryLayer,
  ImpactLayer,
  AdminLevelDataLayer,
  PointDataLayer,
  WMSLayer,
} from './Layers';

import {
  DiscriminateUnion,
  LayerType,
  LayerKey,
  BoundaryLayerProps,
} from '../../config/types';

import { Extent } from './Layers/raster-utils';
import { useUrlHistory } from '../../utils/url-utils';

import {
  getBoundaryLayerSingleton,
  getBoundaryLayers,
  LayerDefinitions,
} from '../../config/utils';

import DateSelector from './DateSelector';
import { findClosestDate } from './DateSelector/utils';
import {
  dateRangeSelector,
  isLoading,
  layersSelector,
  layerDataSelector,
} from '../../context/mapStateSlice/selectors';
import { addLayer, setMap, updateDateRange } from '../../context/mapStateSlice';
import {
  hidePopup,
  addPopupData,
  setWMSGetFeatureInfoLoading,
} from '../../context/tooltipStateSlice';
import {
  availableDatesSelector,
  isLoading as areDatesLoading,
  loadAvailableDates,
} from '../../context/serverStateSlice';

import { appConfig } from '../../config';
import { loadLayerData, LayerData } from '../../context/layers/layer-data';
import Analyser from './Analyser';
import AnalysisLayer from './Layers/AnalysisLayer';
import {
  DateCompatibleLayer,
  getPossibleDatesForLayer,
  makeFeatureInfoRequest,
} from '../../utils/server-utils';
import { addNotification } from '../../context/notificationStateSlice';
import { getActiveFeatureInfoLayers, getFeatureInfoParams } from './utils';
import AlertForm from './AlertForm';

const MapboxMap = ReactMapboxGl({
  accessToken: process.env.REACT_APP_MAPBOX_TOKEN as string,
  preserveDrawingBuffer: true,
});

type LayerComponentsMap<U extends LayerType> = {
  [T in U['type']]: ComponentType<{ layer: DiscriminateUnion<U, 'type', T> }>;
};

const componentTypes: LayerComponentsMap<LayerType> = {
  boundary: BoundaryLayer,
  wms: WMSLayer,
  admin_level_data: AdminLevelDataLayer,
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

  const selectedDateRef = useRef<DatePicker>(null);

  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const serverAvailableDates = useSelector(availableDatesSelector);
  const selectedLayersWithDateSupport = selectedLayers
    .filter((layer): layer is DateCompatibleLayer =>
      dateSupportLayerTypes.includes(layer.type),
    )
    .filter(layer => !layer.group || layer.group.main === true);

  const boundaryLayer = getBoundaryLayerSingleton();
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;

  const adminBoundariesExtent = useMemo(() => {
    if (!boundaryLayerData) {
      return undefined;
    }
    return bbox(boundaryLayerData.data) as Extent; // we get extents of admin boundaries to give to the api.
  }, [boundaryLayerData]);

  const { urlParams, updateHistory } = useUrlHistory();
  // let users know if their current date doesn't exist in possible dates
  const urlDate = urlParams.get('date');

  useEffect(() => {
    /*
      This useEffect hook keeps track of parameters obtained from url and loads layers according
      to the hazardLayerId and baselineLayerId values. If the date field is found, the application
      status is also updated. There are guards in case the values are not valid, such as invalid
      date or layerids.
    */

    const hazardLayerId = urlParams.get('hazardLayerId');
    const baselineLayerId = urlParams.get('baselineLayerId');

    if (
      (!hazardLayerId && !baselineLayerId) ||
      Object.keys(serverAvailableDates).length === 0
    ) {
      return;
    }

    const selectedLayersIds: LayerKey[] = selectedLayers.map(layer => layer.id);

    // Check for layers in url and add them.
    [hazardLayerId, baselineLayerId].forEach(id => {
      if (!id || selectedLayersIds.includes(id as LayerKey)) {
        return;
      }

      if (Object.keys(LayerDefinitions).includes(id)) {
        dispatch(addLayer(LayerDefinitions[id as LayerKey]));

        if (selectedDate && !urlDate) {
          updateHistory('date', moment(selectedDate).format('YYYY-MM-DD'));
        }
      } else {
        dispatch(
          addNotification({
            message: `Invalid layer identifier: ${id}`,
            type: 'error',
          }),
        );
      }
    });

    if (
      urlDate &&
      moment(urlDate).valueOf() !== selectedDate &&
      selectedLayersIds.includes(hazardLayerId as LayerKey)
    ) {
      const dateInt = moment(urlDate).valueOf();
      if (Number.isNaN(dateInt)) {
        dispatch(
          addNotification({
            message: 'Invalid date found. Using most recent date',
            type: 'warning',
          }),
        );
      } else {
        dispatch(updateDateRange({ startDate: dateInt }));
      }
    }

    // Validate hazardLayer.
  }, [
    urlParams,
    urlDate,
    dispatch,
    selectedLayers,
    serverAvailableDates,
    selectedDate,
    updateHistory,
  ]);

  useEffect(() => {
    dispatch(loadAvailableDates());
    const boundaryLayers = getBoundaryLayers();

    // we must load boundary layer here for two reasons
    // 1. Stop showing two loading screens on startup - Mapbox renders its children very late, so we can't rely on BoundaryLayer to load internally
    // 2. Prevent situations where a user can toggle a layer like NSO (depends on Boundaries) before Boundaries finish loading.
    boundaryLayers.map(l => dispatch(addLayer(l)));
    boundaryLayers.map(l => dispatch(loadLayerData({ layer: l })));
  }, [boundaryLayer, dispatch]);

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

    if (selectedDate && urlDate && moment(urlDate).valueOf() !== selectedDate) {
      selectedLayersWithDateSupport.forEach(layer => {
        const momentSelectedDate = moment(selectedDate);

        // we convert to date strings, so hh:ss is irrelevant
        if (
          !getPossibleDatesForLayer(layer, serverAvailableDates)
            .map(date => moment(date).format('YYYY-MM-DD'))
            .includes(momentSelectedDate.format('YYYY-MM-DD'))
        ) {
          const closestDate = findClosestDate(selectedDate, selectedLayerDates);

          updateHistory('date', closestDate.format('YYYY-MM-DD'));

          dispatch(
            addNotification({
              message: `No data was found for the layer '${
                layer.title
              }' on ${momentSelectedDate.format(
                'YYYY-MM-DD',
              )}. The closest date ${closestDate.format(
                'YYYY-MM-DD',
              )} has been loaded instead`,
              type: 'warning',
            }),
          );
        }
      });
    }
  }, [
    dispatch,
    selectedDate,
    selectedLayerDates,
    selectedLayersWithDateSupport,
    serverAvailableDates,
    updateHistory,
    urlParams,
    urlDate,
  ]);

  const {
    map: { latitude, longitude, zoom },
  } = appConfig;

  // Saves a reference to base MapboxGL Map object in case child layers need access beyond the React wrappers
  const saveMap = (map: Map) => dispatch(setMap(() => map));

  return (
    <Grid item className={classes.container}>
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
        onClick={(map: Map, evt: any) => {
          dispatch(hidePopup());
          // Get layers that have getFeatureInfo option.
          const featureInfoLayers = getActiveFeatureInfoLayers(map);
          if (featureInfoLayers.length === 0) {
            return;
          }

          const dateFromRef = moment(
            selectedDateRef.current?.props.selected as Date,
          ).format('YYYY-MM-DD');

          const params = getFeatureInfoParams(map, evt, dateFromRef);
          dispatch(setWMSGetFeatureInfoLoading(true));
          makeFeatureInfoRequest(featureInfoLayers, params).then(
            (result: { [name: string]: string } | null) => {
              if (result) {
                Object.keys(result).forEach((k: string) => {
                  dispatch(
                    addPopupData({
                      [k]: {
                        data: result[k],
                        coordinates: evt.lngLat,
                      },
                    }),
                  );
                });
              }
              dispatch(setWMSGetFeatureInfoLoading(false));
            },
          );
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
      <Grid
        container
        justify="space-between"
        className={classes.buttonContainer}
      >
        <Grid item>
          <Analyser extent={adminBoundariesExtent} />
          {appConfig.alertFormActive === true ? <AlertForm /> : null}
        </Grid>
        <Grid item>
          <Grid container spacing={1}>
            <BoundarySelector boundaryLayerData={boundaryLayerData} />
            <Download />
            <Legends layers={selectedLayers} extent={adminBoundariesExtent} />
          </Grid>
        </Grid>
      </Grid>
      {selectedLayerDates.length > 0 && (
        <DateSelector
          availableDates={selectedLayerDates}
          selectedDateRef={selectedDateRef}
        />
      )}
    </Grid>
  );
}

const styles = () =>
  createStyles({
    container: {
      height: '100%',
      position: 'relative',
    },
    buttonContainer: {
      zIndex: 5,
      position: 'absolute',
      top: 0,
      width: '100%',
      padding: '16px',
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
