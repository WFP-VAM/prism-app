import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  CircularProgress,
  createStyles,
  Grid,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { countBy, get, pickBy } from 'lodash';
import moment from 'moment';
// map
import bbox from '@turf/bbox';
import {
  BoundaryLayerProps,
  isMainLayer,
  LayerKey,
  LayerType,
  PanelSize,
} from 'config/types';
import { getUrlKey, UrlLayerKey, useUrlHistory } from 'utils/url-utils';
import {
  getBoundaryLayerSingleton,
  getDisplayBoundaryLayers,
  LayerDefinitions,
} from 'config/utils';
import {
  dateRangeSelector,
  layerDataSelector,
  layersSelector,
} from 'context/mapStateSlice/selectors';

import {
  addLayer,
  layerOrdering,
  removeLayer,
  updateDateRange,
} from 'context/mapStateSlice';
import { hidePopup } from 'context/tooltipStateSlice';
import {
  availableDatesSelector,
  isLoading as areDatesLoading,
  loadAvailableDates,
} from 'context/serverStateSlice';

import { appConfig } from 'config';
import { LayerData, loadLayerData } from 'context/layers/layer-data';
import {
  DateCompatibleLayer,
  getPossibleDatesForLayer,
} from 'utils/server-utils';
import { addNotification } from 'context/notificationStateSlice';
import GoToBoundaryDropdown from 'components/Common/BoundaryDropdown/goto';
import { DEFAULT_DATE_FORMAT } from 'utils/name-utils';
import DataViewer from 'components/DataViewer';
import { LocalError } from 'utils/error-utils';
import AlertForm from './AlertForm';
import BoundaryInfoBox from './BoundaryInfoBox';
import LeftPanel from './LeftPanel';
import FoldButton from './FoldButton';
import MapComponent from './Map';
import { checkLayerAvailableDatesAndContinueOrRemove } from './utils';
import DateSelector from './DateSelector';
import { findClosestDate } from './DateSelector/utils';
import { Extent } from './Layers/raster-utils';
import Legends from './Legends';

const dateSupportLayerTypes: Array<LayerType['type']> = [
  'impact',
  'point_data',
  'wms',
  'static_raster',
];

const MapView = memo(({ classes }: MapViewProps) => {
  // App config attributes
  const { alertFormActive, hidePanel } = appConfig;

  const boundaryLayer = useMemo(() => {
    return getBoundaryLayerSingleton();
  }, []);

  const boundaryLayerId = useMemo(() => {
    return boundaryLayer.id;
  }, [boundaryLayer.id]);

  // Selectors
  const unsortedSelectedLayers = useSelector(layersSelector);
  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const datesLoading = useSelector(areDatesLoading);
  const serverAvailableDates = useSelector(availableDatesSelector);
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayerId)) as
    | LayerData<BoundaryLayerProps>
    | undefined;

  // State attributes
  const [defaultLayerAttempted, setDefaultLayerAttempted] = useState(false);
  const [isAlertFormOpen, setIsAlertFormOpen] = useState(false);
  const [panelSize, setPanelSize] = useState<PanelSize>(PanelSize.medium);
  const [isPanelHidden, setIsPanelHidden] = useState<boolean>(
    Boolean(hidePanel),
  );

  const dispatch = useDispatch();

  // Prioritize boundary and point_data layers
  const selectedLayers = useMemo(() => {
    // eslint-disable-next-line fp/no-mutating-methods
    return [...unsortedSelectedLayers].sort(layerOrdering);
  }, [unsortedSelectedLayers]);

  const selectedLayersWithDateSupport = useMemo(() => {
    return selectedLayers
      .filter((layer): layer is DateCompatibleLayer => {
        if (
          layer.type === 'admin_level_data' ||
          layer.type === 'static_raster'
        ) {
          return Boolean(layer.dates);
        }
        if (layer.type === 'wms') {
          // some WMS layer might not have date dimension (i.e. static data)
          return layer.serverLayerName in serverAvailableDates;
        }
        return dateSupportLayerTypes.includes(layer.type);
      })
      .filter(layer => isMainLayer(layer.id, selectedLayers))
      .map(layer => {
        return {
          ...layer,
          dateItems: getPossibleDatesForLayer(layer, serverAvailableDates)
            .filter(value => value) // null check
            .flat(),
        };
      });
  }, [selectedLayers, serverAvailableDates]);

  // TODO - could we simply use the country boundary extent here instead of the calculation?
  // Or can we foresee any edge cases?
  const adminBoundariesExtent = useMemo(() => {
    if (!boundaryLayerData) {
      return undefined;
    }
    return bbox(boundaryLayerData.data) as Extent; // we get extents of admin boundaries to give to the api.
  }, [boundaryLayerData]);

  const { urlParams, updateHistory, removeLayerFromUrl } = useUrlHistory();

  // let users know if their current date doesn't exist in possible dates
  const urlDate = useMemo(() => {
    return urlParams.get('date');
  }, [urlParams]);

  const hazardLayerIds = useMemo(() => {
    return urlParams.get(UrlLayerKey.HAZARD);
  }, [urlParams]);

  const baselineLayerIds = useMemo(() => {
    return urlParams.get(UrlLayerKey.ADMINLEVEL);
  }, [urlParams]);

  const defaultLayer = useMemo(() => {
    return get(appConfig, 'defaultLayer');
  }, []);

  const layerDefinitionsIncludeDefaultLayer = useMemo(() => {
    return Object.keys(LayerDefinitions).includes(defaultLayer);
  }, [defaultLayer]);

  const defaultLayerInLayerDefinitions = useMemo(() => {
    return LayerDefinitions[defaultLayer as LayerKey];
  }, [defaultLayer]);

  const serverAvailableDatesAreEmpty = useMemo(() => {
    return Object.keys(serverAvailableDates).length === 0;
  }, [serverAvailableDates]);

  const selectedLayersIds = useMemo(() => {
    return selectedLayers.map(layer => layer.id);
  }, [selectedLayers]);

  const hazardLayersArray = useMemo(() => {
    return hazardLayerIds !== null ? hazardLayerIds.split(',') : [];
  }, [hazardLayerIds]);

  const baselineLayersArray = useMemo(() => {
    return baselineLayerIds !== null ? baselineLayerIds.split(',') : [];
  }, [baselineLayerIds]);

  const urlLayerIds = useMemo(() => {
    return [...hazardLayersArray, ...baselineLayersArray];
  }, [baselineLayersArray, hazardLayersArray]);

  const layerDefinitionIds = useMemo(() => {
    return Object.keys(LayerDefinitions);
  }, []);

  // Check for invalid layer ids.
  const invalidLayersIds = useMemo(() => {
    return urlLayerIds.filter(layerId => !layerDefinitionIds.includes(layerId));
  }, [layerDefinitionIds, urlLayerIds]);

  // Check for layers that have not been included.
  const missingLayers = useMemo(() => {
    return urlLayerIds.filter(
      layerId => !selectedLayersIds.includes(layerId as LayerKey),
    );
  }, [selectedLayersIds, urlLayerIds]);

  // Adds missing layers to existing map instance
  const addMissingLayers = useCallback(() => {
    missingLayers.forEach(layerId => {
      const layer = LayerDefinitions[layerId as LayerKey];
      try {
        checkLayerAvailableDatesAndContinueOrRemove(
          layer,
          serverAvailableDates,
          removeLayerFromUrl,
          dispatch,
        );
      } catch (error) {
        console.error((error as LocalError).getErrorMessage());
        return;
      }
      dispatch(addLayer(layer));
    });
  }, [dispatch, missingLayers, removeLayerFromUrl, serverAvailableDates]);

  // The date integer from url
  const dateInt = useMemo(() => {
    return moment(urlDate).set({ hour: 12, minute: 0 }).valueOf();
  }, [urlDate]);

  /*
    takes all the dates possible for every layer and counts the amount of times each one is duplicated.
    if a date's duplicate amount is the same as the number of layers active, then this date is compatible with all layers selected.
  */
  const selectedLayerDatesDupCount = useMemo(() => {
    return countBy(
      selectedLayersWithDateSupport
        .map(layer => getPossibleDatesForLayer(layer, serverAvailableDates))
        .filter(value => value) // null check
        .flat()
        .map(value => moment(value.displayDate).format(DEFAULT_DATE_FORMAT)),
    );
  }, [selectedLayersWithDateSupport, serverAvailableDates]);

  // calculate possible dates user can pick from the currently selected layers
  const selectedLayerDates: number[] = useMemo(() => {
    if (selectedLayersWithDateSupport.length === 0) {
      return [];
    }
    /*
      Only keep the dates which were duplicated the same amount of times as the amount of layers active...and convert back to array.
     */
    return Object.keys(
      pickBy(
        selectedLayerDatesDupCount,
        dupTimes => dupTimes >= selectedLayersWithDateSupport.length,
      ),
      // convert back to number array after using YYYY-MM-DD strings in countBy
    ).map(dateString =>
      moment.utc(dateString).set({ hour: 12, minute: 0 }).valueOf(),
    );
  }, [selectedLayerDatesDupCount, selectedLayersWithDateSupport.length]);

  /*
    reverse the order off adding layers so that the first boundary layer will be placed at the very bottom,
    to prevent other boundary layers being covered by any layers
  */
  const displayedBoundaryLayers = useMemo(() => {
    // eslint-disable-next-line fp/no-mutating-methods
    return getDisplayBoundaryLayers().reverse();
  }, []);

  const loadBoundaryLayerData = useCallback(() => {
    displayedBoundaryLayers.forEach(l => dispatch(addLayer(l)));
    displayedBoundaryLayers.forEach(l => dispatch(loadLayerData({ layer: l })));
  }, [dispatch, displayedBoundaryLayers]);

  const showBoundaryInfo = useMemo(() => {
    return JSON.parse(process.env.REACT_APP_SHOW_MAP_INFO || 'false');
  }, []);

  const isShowingExtraFeatures = useMemo(() => {
    return panelSize !== PanelSize.xlarge || isPanelHidden;
  }, [isPanelHidden, panelSize]);

  const removeLayerAndUpdateHistory = useCallback(
    (layerToRemove: LayerType, layerToKeep: LayerType) => {
      if (!selectedDate) {
        return;
      }
      // Remove layer from url.
      const urlLayerKey = getUrlKey(layerToRemove);
      removeLayerFromUrl(urlLayerKey, layerToRemove.id);
      dispatch(removeLayer(layerToRemove));

      const layerToKeepDates = getPossibleDatesForLayer(
        layerToKeep as DateCompatibleLayer,
        serverAvailableDates,
      ).map(dateItem => dateItem.displayDate);

      const closestDate = findClosestDate(selectedDate, layerToKeepDates);

      updateHistory('date', closestDate.format(DEFAULT_DATE_FORMAT));
    },
    [
      dispatch,
      removeLayerFromUrl,
      selectedDate,
      serverAvailableDates,
      updateHistory,
    ],
  );

  const possibleDatesForLayerIncludeMomentSelectedDate = useCallback(
    (layer: DateCompatibleLayer, momentSelectedDate: moment.Moment) => {
      // we convert to date strings, so hh:ss is irrelevant
      return getPossibleDatesForLayer(layer, serverAvailableDates)
        .map(dateItem =>
          moment(dateItem.displayDate).format(DEFAULT_DATE_FORMAT),
        )
        .includes(momentSelectedDate.format(DEFAULT_DATE_FORMAT));
    },
    [serverAvailableDates],
  );

  useEffect(() => {
    /*
      This useEffect hook keeps track of parameters obtained from url and loads layers according
      to the hazardLayerId and baselineLayerId values. If the date field is found, the application
      status is also updated. There are guards in case the values are not valid, such as invalid
      date or layerids.
      */
    if (hazardLayerIds || baselineLayerIds) {
      return;
    }
    if (!defaultLayer) {
      return;
    }
    /*
      In case we don't have hazard or baseline layers we will use the default
      layer provided in the appConfig defined within `prism.json` file.
     */
    if (!defaultLayerAttempted && layerDefinitionsIncludeDefaultLayer) {
      setDefaultLayerAttempted(true);
      const urlLayerKey: UrlLayerKey = getUrlKey(
        defaultLayerInLayerDefinitions,
      );
      updateHistory(urlLayerKey, defaultLayer);
      return;
    }
    if (!defaultLayerAttempted) {
      dispatch(
        addNotification({
          message: `Invalid default layer identifier: ${defaultLayer}`,
          type: 'error',
        }),
      );
      setDefaultLayerAttempted(true);
    }
  }, [
    baselineLayerIds,
    defaultLayer,
    defaultLayerAttempted,
    defaultLayerInLayerDefinitions,
    dispatch,
    hazardLayerIds,
    layerDefinitionsIncludeDefaultLayer,
    updateHistory,
  ]);

  useEffect(() => {
    if (
      (!hazardLayerIds && !baselineLayerIds) ||
      serverAvailableDatesAreEmpty
    ) {
      return;
    }

    // TODO - remove layers after dispatching the error message.
    if (invalidLayersIds.length > 0) {
      dispatch(
        addNotification({
          message: `Invalid layer identifier(s): ${invalidLayersIds.join(',')}`,
          type: 'error',
        }),
      );
      return;
    }

    // Add the missing layers
    addMissingLayers();

    if (!urlDate || dateInt === selectedDate) {
      return;
    }

    if (!Number.isNaN(dateInt)) {
      dispatch(updateDateRange({ startDate: dateInt }));
      updateHistory('date', moment(dateInt).format(DEFAULT_DATE_FORMAT));
      return;
    }

    dispatch(
      addNotification({
        message: 'Invalid date found. Using most recent date',
        type: 'warning',
      }),
    );
  }, [
    addMissingLayers,
    baselineLayerIds,
    dateInt,
    dispatch,
    hazardLayerIds,
    invalidLayersIds,
    selectedDate,
    serverAvailableDatesAreEmpty,
    updateHistory,
    urlDate,
  ]);

  useEffect(() => {
    dispatch(loadAvailableDates());
    // when we switch layers, or change dates, close any active pop-ups
    dispatch(hidePopup());

    // we must load boundary layer here for two reasons
    // 1. Stop showing two loading screens on startup - Mapbox renders its children very late, so we can't rely on BoundaryLayer to load internally
    // 2. Prevent situations where a user can toggle a layer like NSO (depends on Boundaries) before Boundaries finish loading.
    loadBoundaryLayerData();
  }, [dispatch, loadBoundaryLayerData]);

  // let users know if the layers selected are not possible to view together.
  useEffect(() => {
    if (
      selectedLayerDates.length !== 0 ||
      selectedLayersWithDateSupport.length === 0 ||
      !selectedDate
    ) {
      return;
    }

    // WARNING - This logic doesn't apply anymore if we order layers differently...
    const layerToRemove = selectedLayers[selectedLayers.length - 2];
    const layerToKeep = selectedLayers[selectedLayers.length - 1];

    dispatch(
      addNotification({
        message: `No dates overlap with the selected layers. Removing previous layer: ${layerToRemove.id}.`,
        type: 'warning',
      }),
    );
    removeLayerAndUpdateHistory(layerToRemove, layerToKeep);
  }, [
    dispatch,
    removeLayerAndUpdateHistory,
    selectedDate,
    selectedLayerDates.length,
    selectedLayers,
    selectedLayersWithDateSupport.length,
  ]);

  useEffect(() => {
    if (
      !selectedDate ||
      !urlDate ||
      moment(urlDate).valueOf() === selectedDate
    ) {
      return;
    }
    selectedLayersWithDateSupport.forEach(layer => {
      const momentSelectedDate = moment(selectedDate);

      if (
        serverAvailableDatesAreEmpty ||
        possibleDatesForLayerIncludeMomentSelectedDate(
          layer,
          momentSelectedDate,
        )
      ) {
        return;
      }

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
    });
  }, [
    dispatch,
    possibleDatesForLayerIncludeMomentSelectedDate,
    selectedDate,
    selectedLayerDates,
    selectedLayersWithDateSupport,
    serverAvailableDatesAreEmpty,
    updateHistory,
    urlDate,
  ]);

  const renderedGridItemAlertForm = useMemo(() => {
    if (!alertFormActive) {
      return null;
    }
    return (
      <Grid item>
        <AlertForm isOpen={isAlertFormOpen} setOpen={setIsAlertFormOpen} />
      </Grid>
    );
  }, [alertFormActive, isAlertFormOpen]);

  const renderedExtraFeatures = useMemo(() => {
    if (!isShowingExtraFeatures) {
      return null;
    }
    return (
      <Grid
        container
        justifyContent="space-between"
        className={classes.buttonContainer}
      >
        <Grid item>
          <Grid container spacing={1}>
            <Grid item>
              <GoToBoundaryDropdown />
            </Grid>
            {renderedGridItemAlertForm}
          </Grid>
          <DataViewer />
        </Grid>
        <Grid item>
          <Grid container spacing={1}>
            <Legends layers={selectedLayers} extent={adminBoundariesExtent} />
          </Grid>
        </Grid>
      </Grid>
    );
  }, [
    adminBoundariesExtent,
    classes.buttonContainer,
    isShowingExtraFeatures,
    renderedGridItemAlertForm,
    selectedLayers,
  ]);

  const renderedDateSelector = useMemo(() => {
    if (!isShowingExtraFeatures || selectedLayerDates.length <= 0) {
      return null;
    }
    return (
      <DateSelector
        availableDates={selectedLayerDates}
        selectedLayers={selectedLayersWithDateSupport}
      />
    );
  }, [
    isShowingExtraFeatures,
    selectedLayerDates,
    selectedLayersWithDateSupport,
  ]);

  const renderedBoundaryInfoBox = useMemo(() => {
    if (!showBoundaryInfo) {
      return null;
    }
    return <BoundaryInfoBox />;
  }, [showBoundaryInfo]);

  const renderedDatesLoader = useMemo(() => {
    if (!datesLoading) {
      return null;
    }
    return (
      <div className={classes.loading}>
        <CircularProgress size={100} />
      </div>
    );
  }, [classes.loading, datesLoading]);

  const activeLayers = useMemo(() => {
    return hazardLayersArray.length + baselineLayersArray.length;
  }, [baselineLayersArray.length, hazardLayersArray.length]);

  return (
    <Box className={classes.root}>
      <LeftPanel
        extent={adminBoundariesExtent}
        panelSize={panelSize}
        setPanelSize={setPanelSize}
        isPanelHidden={isPanelHidden}
        activeLayers={activeLayers}
      />
      <Box className={classes.container}>
        <Box
          className={classes.optionContainer}
          style={{ marginLeft: isPanelHidden ? PanelSize.folded : panelSize }}
        >
          <FoldButton
            activeLayers={activeLayers}
            isPanelHidden={isPanelHidden}
            setIsPanelHidden={setIsPanelHidden}
          />
          {renderedExtraFeatures}
          {renderedDateSelector}
          {renderedBoundaryInfoBox}
        </Box>
      </Box>
      {renderedDatesLoader}
      <MapComponent
        panelHidden={isPanelHidden}
        selectedLayers={selectedLayers}
        setIsAlertFormOpen={setIsAlertFormOpen}
        boundaryLayerId={boundaryLayerId}
      />
    </Box>
  );
});

const styles = () =>
  createStyles({
    root: {
      height: '100%',
      width: '100%',
      position: 'relative',
    },
    container: {
      height: '100%',
      width: '100%',
      position: 'absolute',
      top: 0,
      right: 0,
    },
    optionContainer: {
      position: 'relative',
      height: '100%',
      display: 'flex',
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
      width: '100%',
      maxHeight: '100px',
      padding: '3px 8px 0 16px',
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
