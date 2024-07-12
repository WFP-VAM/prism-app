import { findClosestDate } from 'components/MapView/DateSelector/utils';
import { checkLayerAvailableDatesAndContinueOrRemove } from 'components/MapView/utils';
import { appConfig } from 'config';
import {
  Extent,
  expandBoundingBox,
} from 'components/MapView/Layers/raster-utils';
import { LayerKey, LayerType, isMainLayer, DateItem } from 'config/types';
import {
  AALayerId,
  LayerDefinitions,
  getBoundaryLayerSingleton,
} from 'config/utils';
import {
  addLayer,
  layerOrdering,
  removeLayer,
  updateDateRange,
} from 'context/mapStateSlice';
import {
  dateRangeSelector,
  layersSelector,
} from 'context/mapStateSlice/selectors';
import { addNotification } from 'context/notificationStateSlice';
import { availableDatesSelector } from 'context/serverStateSlice';
import { countBy, get, pickBy } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { LocalError } from 'utils/error-utils';
import { DateFormat } from 'utils/name-utils';
import {
  DateCompatibleLayer,
  getAAAvailableDatesCombined,
  getPossibleDatesForLayer,
} from 'utils/server-utils';
import { UrlLayerKey, getUrlKey, useUrlHistory } from 'utils/url-utils';
import { AAAvailableDatesSelector } from 'context/anticipatoryActionStateSlice';

import {
  datesAreEqualWithoutTime,
  binaryIncludes,
  getFormattedDate,
  getTimeInMilliseconds,
} from './date-utils';

const dateSupportLayerTypes: Array<LayerType['type']> = [
  'impact',
  'point_data',
  'wms',
  'static_raster',
  'anticipatory_action',
];

const useLayers = () => {
  const dispatch = useDispatch();
  const [defaultLayerAttempted, setDefaultLayerAttempted] = useState(false);

  const { urlParams, updateHistory, removeLayerFromUrl } = useUrlHistory();
  const boundaryLayerId = getBoundaryLayerSingleton().id;

  const unsortedSelectedLayers = useSelector(layersSelector);
  const serverAvailableDates = useSelector(availableDatesSelector);
  const AAAvailableDates = useSelector(AAAvailableDatesSelector);
  const { startDate: selectedDate } = useSelector(dateRangeSelector);

  const AAAvailableDatesCombined = useMemo(
    () =>
      AAAvailableDates ? getAAAvailableDatesCombined(AAAvailableDates) : [],
    [AAAvailableDates],
  );

  const hazardLayerIds = useMemo(
    () => urlParams.get(UrlLayerKey.HAZARD),
    [urlParams],
  );

  const hazardLayersArray = useMemo(
    () => (hazardLayerIds !== null ? hazardLayerIds.split(',') : []),
    [hazardLayerIds],
  );

  const baselineLayerIds = useMemo(
    () => urlParams.get(UrlLayerKey.ADMINLEVEL),
    [urlParams],
  );

  const baselineLayersArray = useMemo(
    () => (baselineLayerIds !== null ? baselineLayerIds.split(',') : []),
    [baselineLayerIds],
  );

  const numberOfActiveLayers = useMemo(
    () =>
      hazardLayersArray.filter(x => x !== AALayerId).length +
      baselineLayersArray.length,
    [baselineLayersArray.length, hazardLayersArray],
  );

  // Prioritize boundary and point_data layers
  const selectedLayers: LayerType[] = useMemo(
    () =>
      // eslint-disable-next-line fp/no-mutating-methods
      [...unsortedSelectedLayers].sort(layerOrdering),
    [unsortedSelectedLayers],
  );

  // expand bounding box by a few degrees to ensure results cover the entire country
  const adminBoundariesExtent = expandBoundingBox(
    appConfig.map.boundingBox as Extent,
    2,
  ) as Extent;

  const selectedLayersWithDateSupport = useMemo(
    () =>
      selectedLayers
        .filter((layer): layer is DateCompatibleLayer => {
          if (
            layer.type === 'admin_level_data' ||
            layer.type === 'static_raster'
          ) {
            return Boolean(layer.dates);
          }
          if (layer.type === 'point_data') {
            // some WMS layer might not have date dimension (i.e. static data)
            return Boolean(layer.dateUrl);
          }
          if (layer.type === 'wms') {
            // some WMS layer might not have date dimension (i.e. static data)
            return layer.id in serverAvailableDates;
          }
          if (layer.type === 'composite') {
            // some WMS layer might not have date dimension (i.e. static data)
            return (
              layer.id in serverAvailableDates ||
              layer.dateLayer in serverAvailableDates
            );
          }
          return dateSupportLayerTypes.includes(layer.type);
        })
        .filter(layer => isMainLayer(layer.id, selectedLayers))
        .map(layer => ({
          ...layer,
          dateItems: getPossibleDatesForLayer(layer, serverAvailableDates)
            .filter(value => value) // null check
            .flat(),
        })),
    [selectedLayers, serverAvailableDates],
  );

  /*
    takes all the dates possible for every layer and counts the amount of times each one is duplicated.
    if a date's duplicate amount is the same as the number of layers active, then this date is compatible with all layers selected.
  */
  const selectedLayerDatesDupCount = useMemo(
    () =>
      countBy(
        selectedLayersWithDateSupport
          .map(layer => {
            if (layer.type === 'anticipatory_action') {
              // Combine dates for all AA windows to allow selecting AA for the whole period
              return AAAvailableDatesCombined;
            }
            return getPossibleDatesForLayer(layer, serverAvailableDates);
          })
          .filter(value => value) // null check
          .flat()
          .map(value => new Date(value.displayDate).toISOString().slice(0, 10)),
      ),
    [
      AAAvailableDatesCombined,
      selectedLayersWithDateSupport,
      serverAvailableDates,
    ],
  );

  // calculate possible dates user can pick from the currently selected layers
  const selectedLayerDates: number[] = useMemo(() => {
    if (selectedLayersWithDateSupport.length === 0) {
      return [];
    }
    /*
      Only keep the dates which were duplicated the same amount of times as the amount of layers active...and convert back to array.
     */
    // eslint-disable-next-line fp/no-mutating-methods
    return Object.keys(
      pickBy(
        selectedLayerDatesDupCount,
        dupTimes => dupTimes >= selectedLayersWithDateSupport.length,
      ),
      // convert back to number array after using YYYY-MM-DD strings in countBy
    )
      .map(dateString => new Date(dateString).setUTCHours(12, 0, 0, 0))
      .sort((a, b) => a - b);
  }, [selectedLayerDatesDupCount, selectedLayersWithDateSupport.length]);

  const defaultLayer = useMemo(() => get(appConfig, 'defaultLayer'), []);

  const layerDefinitionsIncludeDefaultLayer = useMemo(
    () => Object.keys(LayerDefinitions).includes(defaultLayer),
    [defaultLayer],
  );

  const defaultLayerInLayerDefinitions = useMemo(
    () => LayerDefinitions[defaultLayer as LayerKey],
    [defaultLayer],
  );

  const selectedLayersIds = useMemo(
    () => selectedLayers.map(layer => layer.id),
    [selectedLayers],
  );

  const urlLayerIds = useMemo(
    () => [...hazardLayersArray, ...baselineLayersArray],
    [baselineLayersArray, hazardLayersArray],
  );

  const missingLayers = useMemo(
    () =>
      urlLayerIds.filter(
        layerId => !selectedLayersIds.includes(layerId as LayerKey),
      ),
    [selectedLayersIds, urlLayerIds],
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

  const serverAvailableDatesAreEmpty = useMemo(
    () => Object.keys(serverAvailableDates).length === 0,
    [serverAvailableDates],
  );

  const layerDefinitionIds = useMemo(() => Object.keys(LayerDefinitions), []);

  // Check for invalid layer ids.
  const invalidLayersIds = useMemo(
    () => urlLayerIds.filter(layerId => !layerDefinitionIds.includes(layerId)),
    [layerDefinitionIds, urlLayerIds],
  );

  // Adds missing layers to existing map instance
  const addMissingLayers = useCallback((): void => {
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

  // let users know if their current date doesn't exist in possible dates
  const urlDate = useMemo(() => urlParams.get('date'), [urlParams]);

  // The date integer from url
  const dateInt = useMemo(
    () => (urlDate ? new Date(urlDate) : new Date()).setUTCHours(12, 0, 0, 0),
    [urlDate],
  );

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

    addMissingLayers();

    if (!urlDate || dateInt === selectedDate) {
      return;
    }

    if (!Number.isNaN(dateInt)) {
      dispatch(updateDateRange({ startDate: dateInt }));
      updateHistory('date', getFormattedDate(dateInt, 'default') as string);
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

      updateHistory(
        'date',
        getFormattedDate(closestDate, DateFormat.Default) as string,
      );
    },
    [
      dispatch,
      removeLayerFromUrl,
      selectedDate,
      serverAvailableDates,
      updateHistory,
    ],
  );

  // let users know if the layers selected are not possible to view together.
  useEffect(() => {
    // TODO: Why is this the case here? maybe we should remove it;
    if (
      // eslint-disable-next-line no-constant-condition
      selectedLayerDates.length !== 0 ||
      selectedLayersWithDateSupport.length === 0 ||
      !selectedDate ||
      1
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

  const possibleDatesForLayerIncludeSelectedDate = useCallback(
    (layer: DateCompatibleLayer, date: Date) =>
      binaryIncludes<DateItem>(
        layer.type === 'anticipatory_action'
          ? AAAvailableDatesCombined
          : getPossibleDatesForLayer(layer, serverAvailableDates),
        date.setUTCHours(12, 0, 0, 0),
        x => new Date(x.displayDate).setUTCHours(12, 0, 0, 0),
      ),
    [AAAvailableDatesCombined, serverAvailableDates],
  );

  useEffect(() => {
    if (
      !selectedDate ||
      !urlDate ||
      getTimeInMilliseconds(urlDate) === selectedDate
    ) {
      return;
    }
    selectedLayersWithDateSupport.forEach(layer => {
      const jsSelectedDate = new Date(selectedDate);

      const AADatesLoaded =
        layer.type !== 'anticipatory_action' ||
        layer.id in serverAvailableDates;

      if (
        serverAvailableDatesAreEmpty ||
        possibleDatesForLayerIncludeSelectedDate(layer, jsSelectedDate) ||
        !AADatesLoaded
      ) {
        return;
      }

      const closestDate = findClosestDate(selectedDate, selectedLayerDates);

      if (
        datesAreEqualWithoutTime(
          jsSelectedDate.valueOf(),
          closestDate.valueOf(),
        )
      ) {
        console.warn({ closestDate });
        console.warn(
          'closest dates is the same as selected date, not updating url',
        );
      } else {
        updateHistory(
          'date',
          getFormattedDate(closestDate, DateFormat.Default) as string,
        );
      }

      dispatch(
        addNotification({
          message: `No data was found for layer '${
            layer.title
          }' on ${getFormattedDate(
            jsSelectedDate,
            DateFormat.Default,
          )}. The closest date ${getFormattedDate(
            closestDate,
            DateFormat.Default,
          )} has been loaded instead.`,
          type: 'warning',
        }),
      );
    });
  }, [
    dispatch,
    possibleDatesForLayerIncludeSelectedDate,
    selectedDate,
    selectedLayerDates,
    selectedLayersWithDateSupport,
    serverAvailableDates,
    serverAvailableDatesAreEmpty,
    updateHistory,
    urlDate,
  ]);

  return {
    adminBoundariesExtent,
    boundaryLayerId,
    numberOfActiveLayers,
    selectedLayerDates,
    selectedLayers,
    selectedLayersWithDateSupport,
  };
};

export default useLayers;
