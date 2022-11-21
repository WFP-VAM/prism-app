import React, {
  ComponentType,
  createElement,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  CircularProgress,
  createStyles,
  Grid,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { countBy, get, pickBy } from 'lodash';
import moment from 'moment';
// map
import ReactMapboxGl from 'react-mapbox-gl';
import { Map, MapSourceDataEvent } from 'mapbox-gl';
import bbox from '@turf/bbox';
import inside from '@turf/boolean-point-in-polygon';
import type { Feature, MultiPolygon } from '@turf/helpers';
import MapTooltip from './MapTooltip';
import Legends from './Legends';
import Download from './Download';
// layers
import {
  AdminLevelDataLayer,
  BoundaryLayer,
  ImpactLayer,
  PointDataLayer,
  WMSLayer,
} from './Layers';

import {
  BoundaryLayerProps,
  DiscriminateUnion,
  isMainLayer,
  LayerKey,
  LayerType,
} from '../../config/types';

import { Extent } from './Layers/raster-utils';
import { useUrlHistory, UrlLayerKey, getUrlKey } from '../../utils/url-utils';

import {
  LayerDefinitions,
  getDisplayBoundaryLayers,
  getBoundaryLayerSingleton,
} from '../../config/utils';

import DateSelector from './DateSelector';
import { findClosestDate } from './DateSelector/utils';
import {
  dateRangeSelector,
  layerDataSelector,
  layersSelector,
  mapSelector,
} from '../../context/mapStateSlice/selectors';
import {
  addLayer,
  setMap,
  updateDateRange,
  removeLayer,
} from '../../context/mapStateSlice';
import * as boundaryInfoStateSlice from '../../context/mapBoundaryInfoStateSlice';
import { setLoadingLayerIds } from '../../context/mapTileLoadingStateSlice';
import {
  addPopupData,
  hidePopup,
  setWMSGetFeatureInfoLoading,
} from '../../context/tooltipStateSlice';
import {
  availableDatesSelector,
  isLoading as areDatesLoading,
  loadAvailableDates,
} from '../../context/serverStateSlice';

import { appConfig } from '../../config';
import { LayerData, loadLayerData } from '../../context/layers/layer-data';
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
import SelectionLayer from './Layers/SelectionLayer';
import { GotoBoundaryDropdown } from './Layers/BoundaryDropdown';
import BoundaryInfoBox from './BoundaryInfoBox';
import { DEFAULT_DATE_FORMAT } from '../../utils/name-utils';
import { firstBoundaryOnView } from '../../utils/map-utils';
import DataViewer from '../DataViewer';

const MapboxMap = ReactMapboxGl({
  accessToken: (process.env.REACT_APP_MAPBOX_TOKEN as string) || '',
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
  'admin_level_data',
  'impact',
  'point_data',
  'wms',
];
const boundaryLayer = getBoundaryLayerSingleton();

function useMapOnClick(setIsAlertFormOpen: (value: boolean) => void) {
  const dispatch = useDispatch();
  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;

  return (
    // this function will only work when boundary data loads.
    // due to how the library works, we can only set this function once,
    // so we should set it when boundary data is present
    boundaryLayerData &&
    ((map: Map, evt: any) => {
      dispatch(hidePopup());
      // Hide the alert popup if we click outside the target country (outside boundary bbox)
      if (
        boundaryLayerData.data.features.every(
          feature =>
            !inside(
              [evt.lngLat.lng, evt.lngLat.lat],
              feature as Feature<MultiPolygon>,
            ),
        )
      ) {
        setIsAlertFormOpen(false);
      }
      // Get layers that have getFeatureInfo option.
      const featureInfoLayers = getActiveFeatureInfoLayers(map);
      if (featureInfoLayers.length === 0) {
        const dateFromRef = moment(selectedDate).format(DEFAULT_DATE_FORMAT);

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
      }
    })
  );
}

function MapView({ classes }: MapViewProps) {
  const [defaultLayerAttempted, setDefaultLayerAttempted] = useState(false);
  const selectedLayers = useSelector(layersSelector);
  const selectedMap = useSelector(mapSelector);
  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const datesLoading = useSelector(areDatesLoading);
  const dispatch = useDispatch();
  const [isAlertFormOpen, setIsAlertFormOpen] = useState(false);
  const serverAvailableDates = useSelector(availableDatesSelector);
  const [firstSymbolId, setFirstSymbolId] = useState<string | undefined>(
    undefined,
  );
  const selectedLayersWithDateSupport = selectedLayers
    .filter((layer): layer is DateCompatibleLayer => {
      if (layer.type === 'admin_level_data') {
        return Boolean(layer.dates) || Boolean(layer.dateUrl);
      }
      if (layer.type === 'wms') {
        // some WMS layer might not have date dimension (i.e. static data)
        return layer.serverLayerName in serverAvailableDates;
      }
      return dateSupportLayerTypes.includes(layer.type);
    })
    .filter(layer => isMainLayer(layer.id, selectedLayers));

  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;

  const adminBoundariesExtent = useMemo(() => {
    if (!boundaryLayerData) {
      return undefined;
    }
    return bbox(boundaryLayerData.data) as Extent; // we get extents of admin boundaries to give to the api.
  }, [boundaryLayerData]);

  const {
    urlParams,
    updateHistory,
    removeKeyFromUrl,
    removeLayerFromUrl,
  } = useUrlHistory();
  // let users know if their current date doesn't exist in possible dates
  const urlDate = urlParams.get('date');
  const mapOnClick = useMapOnClick(setIsAlertFormOpen);

  useEffect(() => {
    /*
      This useEffect hook keeps track of parameters obtained from url and loads layers according
      to the hazardLayerId and baselineLayerId values. If the date field is found, the application
      status is also updated. There are guards in case the values are not valid, such as invalid
      date or layerids.
      */
    const hazardLayerIds = urlParams.get(UrlLayerKey.HAZARD);
    const baselineLayerId = urlParams.get(UrlLayerKey.ADMINLEVEL);

    /*
      In case we don't have hazard or baseline layers we will use the default
      layer provided in the appConfig defined within `prism.json` file.
     */
    if (!hazardLayerIds && !baselineLayerId) {
      const defaultLayer = get(appConfig, 'defaultLayer');

      if (defaultLayer) {
        if (Object.keys(LayerDefinitions).includes(defaultLayer)) {
          const layer = LayerDefinitions[defaultLayer as LayerKey];
          const urlLayerKey: UrlLayerKey = getUrlKey(layer);
          updateHistory(urlLayerKey, defaultLayer);
        } else if (!defaultLayerAttempted) {
          dispatch(
            addNotification({
              message: `Invalid default layer identifier: ${defaultLayer}`,
              type: 'error',
            }),
          );
          setDefaultLayerAttempted(true);
        }
      }
    }

    if (
      (!hazardLayerIds && !baselineLayerId) ||
      Object.keys(serverAvailableDates).length === 0
    ) {
      return;
    }

    const selectedLayersIds: LayerKey[] = selectedLayers.map(layer => layer.id);

    const hazardLayersArray =
      hazardLayerIds !== null ? hazardLayerIds.split(',') : [];

    const urlLayerIds = [
      ...hazardLayersArray,
      ...(baselineLayerId === null ? [] : [baselineLayerId]),
    ];

    // Check for invalid layer ids.
    const layerDefinitionIds = Object.keys(LayerDefinitions);
    const invalidLayersIds = urlLayerIds.filter(
      layerId => layerDefinitionIds.includes(layerId) === false,
    );

    if (invalidLayersIds.length > 0) {
      const invalidLayersStr = invalidLayersIds.join(',');

      dispatch(
        addNotification({
          message: `Invalid layer identifier(s): ${invalidLayersStr}`,
          type: 'error',
        }),
      );

      return;
    }

    // Check for layers that have not been included.
    const missingLayers = urlLayerIds.filter(
      layerId => selectedLayersIds.includes(layerId as LayerKey) === false,
    );

    missingLayers.forEach(layerId => {
      const layer = LayerDefinitions[layerId as LayerKey];
      dispatch(addLayer(layer));
    });

    const dateInt = moment(urlDate).set({ hour: 12 }).valueOf();

    if (!urlDate || dateInt === selectedDate) {
      return;
    }

    if (Number.isNaN(dateInt)) {
      dispatch(
        addNotification({
          message: 'Invalid date found. Using most recent date',
          type: 'warning',
        }),
      );
    } else {
      dispatch(updateDateRange({ startDate: dateInt }));
      updateHistory('date', moment(dateInt).format(DEFAULT_DATE_FORMAT));
    }
  }, [
    urlParams,
    urlDate,
    dispatch,
    selectedLayers,
    serverAvailableDates,
    selectedDate,
    updateHistory,
    defaultLayerAttempted,
  ]);

  useEffect(() => {
    dispatch(loadAvailableDates());

    /*
      reverse the order off adding layers so that the first boundary layer will be placed at the very bottom,
      to prevent other boundary layers being covered by any layers
    */
    // eslint-disable-next-line fp/no-mutating-methods
    const displayBoundaryLayers = getDisplayBoundaryLayers().reverse();

    // we must load boundary layer here for two reasons
    // 1. Stop showing two loading screens on startup - Mapbox renders its children very late, so we can't rely on BoundaryLayer to load internally
    // 2. Prevent situations where a user can toggle a layer like NSO (depends on Boundaries) before Boundaries finish loading.
    displayBoundaryLayers.map(l => dispatch(addLayer(l)));
    displayBoundaryLayers.map(l => dispatch(loadLayerData({ layer: l })));
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
        .map(value => moment(value).format(DEFAULT_DATE_FORMAT)),
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
      selectedLayersWithDateSupport.length !== 0 &&
      selectedDate
    ) {
      const layerToRemove = selectedLayers[selectedLayers.length - 2];
      const layerToKeep = selectedLayers[selectedLayers.length - 1];

      dispatch(
        addNotification({
          message: `No dates overlap with the selected layers. Removing previous layer: ${layerToRemove.id}.`,
          type: 'warning',
        }),
      );

      // Remove layer from url.
      const urlLayerKey = getUrlKey(layerToRemove);
      removeLayerFromUrl(urlLayerKey, layerToRemove.id);
      dispatch(removeLayer(layerToRemove));

      const layerToKeepDates = getPossibleDatesForLayer(
        layerToKeep as DateCompatibleLayer,
        serverAvailableDates,
      );

      const closestDate = findClosestDate(selectedDate, layerToKeepDates);

      updateHistory('date', closestDate.format(DEFAULT_DATE_FORMAT));
    }

    if (selectedDate && urlDate && moment(urlDate).valueOf() !== selectedDate) {
      selectedLayersWithDateSupport.forEach(layer => {
        const momentSelectedDate = moment(selectedDate);

        // we convert to date strings, so hh:ss is irrelevant
        if (
          // TODO - Replace the serverAvailableDates check by a loading flag
          // to know if dates haven't been loaded yet?
          Object.keys(serverAvailableDates).length !== 0 &&
          !getPossibleDatesForLayer(layer, serverAvailableDates)
            .map(date => moment(date).format(DEFAULT_DATE_FORMAT))
            .includes(momentSelectedDate.format(DEFAULT_DATE_FORMAT))
        ) {
          const closestDate = findClosestDate(selectedDate, selectedLayerDates);

          updateHistory('date', closestDate.format(DEFAULT_DATE_FORMAT));

          dispatch(
            addNotification({
              message: `No data was found for layer '${
                layer.title
              }' on ${momentSelectedDate.format(
                DEFAULT_DATE_FORMAT,
              )}. The closest date ${closestDate.format(
                DEFAULT_DATE_FORMAT,
              )} has been loaded instead.`,
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
    removeKeyFromUrl,
    removeLayerFromUrl,
    selectedLayers,
  ]);

  // Listen for MapSourceData events to track WMS Layers that are currently loading its tile images.
  const trackLoadingLayers = (map: Map) => {
    // Track with local state to minimize expensive dispatch call
    const layerIds = new Set<LayerKey>();
    const listener = (e: MapSourceDataEvent) => {
      if (e.sourceId && e.sourceId.startsWith('source-')) {
        const layerId = e.sourceId.substring('source-'.length) as LayerKey;
        const included = layerIds.has(layerId);
        if (!included && !e.isSourceLoaded) {
          layerIds.add(layerId);
          dispatch(setLoadingLayerIds([...layerIds]));
        } else if (included && e.isSourceLoaded) {
          layerIds.delete(layerId);
          dispatch(setLoadingLayerIds([...layerIds]));
        }
      }
    };
    map.on('sourcedataloading', listener);
    map.on('sourcedata', listener);
    map.on('idle', () => {
      if (layerIds.size > 0) {
        layerIds.clear();
        dispatch(setLoadingLayerIds([...layerIds]));
      }
    });
  };

  const watchBoundaryChange = (map: Map) => {
    const { setBounds, setLocation } = boundaryInfoStateSlice;
    const onDragend = () => {
      const bounds = map.getBounds();
      dispatch(setBounds(bounds));
    };
    const onZoomend = () => {
      const bounds = map.getBounds();
      const newZoom = map.getZoom();
      dispatch(setLocation({ bounds, zoom: newZoom }));
    };
    map.on('dragend', onDragend);
    map.on('zoomend', onZoomend);
    // Show initial value
    onZoomend();
  };

  const showBoundaryInfo = JSON.parse(
    process.env.REACT_APP_SHOW_MAP_INFO || 'false',
  );

  const {
    map: { latitude, longitude, zoom },
  } = appConfig;
  // Saves a reference to base MapboxGL Map object in case child layers need access beyond the React wrappers.
  // Jump map to center here instead of map initial state to prevent map re-centering on layer changes
  const saveAndJumpMap = (map: Map) => {
    const { layers } = map.getStyle();
    // Find the first symbol on the map to make sure we add boundary layers below them.
    setFirstSymbolId(layers?.find(layer => layer.type === 'symbol')?.id);
    dispatch(setMap(() => map));
    map.jumpTo({ center: [longitude, latitude], zoom });
    const { maxBounds, minZoom, maxZoom } = appConfig.map;
    map.setMaxBounds(maxBounds);
    map.setMinZoom(minZoom);
    map.setMaxZoom(maxZoom);
    if (showBoundaryInfo) {
      watchBoundaryChange(map);
    }
    trackLoadingLayers(map);
  };

  const style = new URL(
    process.env.REACT_APP_DEFAULT_STYLE ||
      'https://api.maptiler.com/maps/0ad52f6b-ccf2-4a36-a9b8-7ebd8365e56f/style.json?key=y2DTSu9yWiu755WByJr3',
  );

  const boundaryId = firstBoundaryOnView(selectedMap);
  const firstBoundaryId = boundaryId && `layer-${boundaryId}-line`;

  return (
    <Grid item className={classes.container}>
      {datesLoading && (
        <div className={classes.loading}>
          <CircularProgress size={100} />
        </div>
      )}
      <MapboxMap
        // eslint-disable-next-line react/style-prop-object
        style={style.toString()}
        onStyleLoad={saveAndJumpMap}
        containerStyle={{
          height: '100%',
        }}
        onClick={mapOnClick}
      >
        {selectedLayers.map(layer => {
          const component: ComponentType<{
            layer: any;
            before?: string;
          }> = componentTypes[layer.type];
          return createElement(component, {
            key: layer.id,
            layer,
            before: layer.type === 'boundary' ? firstSymbolId : firstBoundaryId,
          });
        })}
        {/* These are custom layers which provide functionality and are not really controllable via JSON */}
        <AnalysisLayer before={firstBoundaryId} />
        <SelectionLayer before={firstSymbolId} />
        <MapTooltip />
      </MapboxMap>
      <Grid
        container
        justify="space-between"
        className={classes.buttonContainer}
      >
        <Grid item>
          <Analyser extent={adminBoundariesExtent} />
          <GotoBoundaryDropdown />
          {appConfig.alertFormActive ? (
            <AlertForm isOpen={isAlertFormOpen} setOpen={setIsAlertFormOpen} />
          ) : null}
          <DataViewer />
        </Grid>
        <Grid item>
          <Grid container spacing={1}>
            <Download />
            <Legends layers={selectedLayers} extent={adminBoundariesExtent} />
          </Grid>
        </Grid>
      </Grid>
      {selectedLayerDates.length > 0 && (
        <DateSelector availableDates={selectedLayerDates} />
      )}
      {showBoundaryInfo && <BoundaryInfoBox />}
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
      // Allow users to click on the map through this div
      pointerEvents: 'none',
      // Give children the ability to be clicked however
      // (go down 2 levels to target raw elements, instead of individual grid cells)
      '& > * > *': {
        pointerEvents: 'auto',
      },
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
