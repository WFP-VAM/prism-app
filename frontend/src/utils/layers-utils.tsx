import {
  expandBoundingBox,
  Extent,
} from 'components/MapView/Layers/raster-utils';
import { checkLayerAvailableDatesAndContinueOrRemove } from 'components/MapView/utils';
import { appConfig } from 'config';
import {
  AnticipatoryAction,
  AvailableDates,
  DateItem,
  isMainLayer,
  LayerKey,
  LayerType,
} from 'config/types';
import {
  AALayerIds,
  getBoundaryLayerSingleton,
  isAnticipatoryActionLayer,
  isWindowedDates,
  LayerDefinitions,
} from 'config/utils';
import { getAAConfig } from 'context/anticipatoryAction/config';
import { useDispatch, useSelector } from 'context/hooks';
import { layerOrdering } from 'context/mapStateSlice';
import { addNotification } from 'context/notificationStateSlice';
import {
  pointDataLayerDatesLoadedSelector,
  wmsLayerDatesLoadedSelector,
} from 'context/serverPreloadStateSlice';
import {
  availableDatesSelector,
  layersLoadingDatesIdsSelector,
} from 'context/serverStateSlice';
import { RootState } from 'context/store';
import { useSafeTranslation } from 'i18n';
import { countBy, get, pickBy, uniqBy } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LocalError } from 'utils/error-utils';
import { DateFormat } from 'utils/name-utils';
import {
  DateCompatibleLayer,
  getAAAvailableDatesCombined,
  getPossibleDatesForLayer,
} from 'utils/server-utils';
import { getUrlKey, UrlLayerKey, useUrlHistory } from 'utils/url-utils';
import { useMapState } from 'utils/useMapState';

import { getNonBoundaryLayers } from './boundary-layers-utils';
import {
  binaryIncludes,
  datesAreEqualWithoutTime,
  dateWithoutTime,
  findClosestDate,
  getFormattedDate,
} from './date-utils';

const dateSupportLayerTypes: Array<LayerType['type']> = [
  'impact',
  'point_data',
  'wms',
  'cog',
  'zarr',
  'static_raster',
  AnticipatoryAction.drought,
  AnticipatoryAction.storm,
  AnticipatoryAction.flood,
];

/**
 * Returns true when `layer` has date support given the currently loaded
 * server-available dates, narrowing the type to `DateCompatibleLayer`.
 *
 * This is the single source of truth for "does this layer have dates?" and
 * is used inside `useLayers` to build `selectedLayersWithDateSupport`.
 */
export function isDateCompatibleLayer(
  layer: LayerType,
  serverAvailableDates: AvailableDates,
): layer is DateCompatibleLayer {
  if (layer.type === 'admin_level_data' || layer.type === 'static_raster') {
    return Boolean(layer.dates);
  }
  if (layer.type === 'point_data') {
    // some point_data layers might not have a date URL (i.e. static data)
    return Boolean(layer.dateUrl);
  }
  if (layer.type === 'wms' || layer.type === 'cog' || layer.type === 'zarr') {
    // some WMS/COG/Zarr layers might not have a date dimension (i.e. static data)
    return layer.id in serverAvailableDates;
  }
  if (layer.type === 'composite') {
    // some WMS layers might not have date dimension (i.e. static data)
    return (
      layer.id in serverAvailableDates ||
      layer.dateLayer in serverAvailableDates
    );
  }
  if (layer.type === 'impact') {
    // Impact layers derive their dates from the hazard layer
    // Check if dates have been loaded for this impact layer
    return layer.id in serverAvailableDates;
  }
  return dateSupportLayerTypes.includes(layer.type);
}

/**
 * WMS layers eligible for batch print picker. Uses Redux when dates are already
 * loaded (`isDateCompatibleLayer`), otherwise falls back to config (`coverageWindow`
 * / `validity`) so the dropdown is not empty before preload completes or when
 * no hazard is on the map. Building `filteredBatchDates` still needs
 * `getPossibleDatesForLayer` → server dates in Redux after `loadAvailableDatesForLayer`.
 */
export function isWmsSelectableForBatchPrint(
  layer: LayerType,
  serverAvailableDates: AvailableDates,
): boolean {
  if (layer.type !== 'wms') {
    return false;
  }
  if (layer.id in serverAvailableDates) {
    return isDateCompatibleLayer(layer, serverAvailableDates);
  }
  return Boolean(layer.coverageWindow || layer.validity);
}

const useLayers = () => {
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();
  const [defaultLayerAttempted, setDefaultLayerAttempted] = useState(false);

  const { urlParams, updateHistory, removeLayerFromUrl } = useUrlHistory();
  const boundaryLayerId = getBoundaryLayerSingleton().id;

  const mapState = useMapState();
  const unsortedSelectedLayers = mapState.layers;
  const serverAvailableDates = useSelector(availableDatesSelector);
  const { startDate: selectedDate } = mapState.dateRange;
  const layersLoadingDates = useSelector(layersLoadingDatesIdsSelector);

  // Separating point and WMS layer loading for #1452
  const wmsLoaded = useSelector(wmsLayerDatesLoadedSelector);
  const pointDataLoaded = useSelector(pointDataLayerDatesLoadedSelector);

  // get AA config
  const AAConfig = useMemo(() => {
    const anticipatoryLayer = unsortedSelectedLayers.find(layer =>
      isAnticipatoryActionLayer(layer.type),
    );
    if (anticipatoryLayer) {
      return getAAConfig(anticipatoryLayer.type as AnticipatoryAction);
    }
    return null;
  }, [unsortedSelectedLayers]);

  const AAAvailableDates = useSelector((state: RootState) =>
    AAConfig ? AAConfig.availableDatesSelector(state) : null,
  );

  const AAAvailableDatesCombined = useMemo(() => {
    if (!AAAvailableDates) {
      return [];
    }
    return isWindowedDates(AAAvailableDates)
      ? getAAAvailableDatesCombined(AAAvailableDates)
      : AAAvailableDates;
  }, [AAAvailableDates]);

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
      hazardLayersArray.filter(
        x => !AALayerIds.includes(x as AnticipatoryAction),
      ).length + baselineLayersArray.length,
    [baselineLayersArray.length, hazardLayersArray],
  );

  // Prioritize boundary and point_data layers
  const selectedLayers: LayerType[] = useMemo(
    () => [...unsortedSelectedLayers].sort(layerOrdering),
    [unsortedSelectedLayers],
  );

  // expand bounding box by a few degrees to ensure results cover the entire country
  const adminBoundariesExtent = expandBoundingBox(
    appConfig.map.boundingBox as Extent,
    2,
  );

  const selectedLayersWithDateSupport = useMemo(
    () =>
      selectedLayers
        .filter(layer => isDateCompatibleLayer(layer, serverAvailableDates))
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
            if (isAnticipatoryActionLayer(layer.type)) {
              // Combine dates for all AA windows to allow selecting AA for the whole period
              return AAAvailableDatesCombined;
            }
            const possibleDates = getPossibleDatesForLayer(
              layer,
              serverAvailableDates,
            );
            const uniqueDates = uniqBy(possibleDates, dateItem =>
              dateWithoutTime(dateItem.displayDate),
            );
            return uniqueDates;
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
  // TODO: this function and selectedLayerDatesDupCount are executed about 20 times
  // when layer selection changes!
  const selectedLayerDates: number[] = useMemo(() => {
    if (selectedLayersWithDateSupport.length === 0) {
      return [];
    }
    const selectedNonAALayersWithDateSupport =
      selectedLayersWithDateSupport.filter(
        layer => !isAnticipatoryActionLayer(layer.type),
      );
    /*
      Only keep the dates which were duplicated the same amount of times as the amount of layers active...and convert back to array.
     */

    return Object.keys(
      pickBy(
        selectedLayerDatesDupCount,
        dupTimes => dupTimes >= selectedNonAALayersWithDateSupport.length,
      ),
      // convert back to number array after using YYYY-MM-DD strings in countBy
    )
      .map(dateString => new Date(dateString).setUTCHours(12, 0, 0, 0))
      .sort((a, b) => a - b);
  }, [selectedLayerDatesDupCount, selectedLayersWithDateSupport]);

  // Check if any selected layers with date support are still loading their dates
  const areLayerDatesLoading = useMemo(() => {
    if (selectedLayersWithDateSupport.length === 0) {
      return false;
    }
    // Check if any selected layer is in the loading state
    return selectedLayersWithDateSupport.some(layer =>
      layersLoadingDates.includes(layer.id),
    );
  }, [selectedLayersWithDateSupport, layersLoadingDates]);

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
          message: t('Invalid default layer identifier: {{defaultLayer}}', {
            defaultLayer,
          }),
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
    t,
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
  const addMissingLayers = useCallback(
    (): void =>
      missingLayers.forEach(layerId => {
        const layer = LayerDefinitions[layerId as LayerKey];
        // Separating point and WMS layer loading for #1452
        if (layer.type === 'wms' && !wmsLoaded) {
          return;
        }
        if (layer.type === 'point_data' && !pointDataLoaded) {
          return;
        }
        let datesReady: boolean = false;
        try {
          datesReady = checkLayerAvailableDatesAndContinueOrRemove(
            layer,
            serverAvailableDates,
            layersLoadingDates,
            removeLayerFromUrl,
            dispatch,
          );
        } catch (error) {
          console.error((error as LocalError).getErrorMessage());
        }
        if (datesReady) {
          mapState.actions.addLayer(layer);
        }
      }),
    [
      dispatch,
      wmsLoaded,
      pointDataLoaded,
      layersLoadingDates,
      missingLayers,
      removeLayerFromUrl,
      serverAvailableDates,
      mapState.actions,
    ],
  );

  // let users know if their current date doesn't exist in possible dates
  const urlDate: string | null = useMemo(() => {
    const r = urlParams.get('date');
    return r === 'undefined' ? null : r;
  }, [urlParams]);

  useEffect(() => {
    if (!hazardLayerIds && !baselineLayerIds) {
      return;
    }

    // TODO - remove layers after dispatching the error message.
    if (invalidLayersIds.length > 0) {
      dispatch(
        addNotification({
          message: t('Invalid layer identifier(s): {{layers}}', {
            layers: invalidLayersIds.join(','),
          }),
          type: 'error',
        }),
      );
      return;
    }

    addMissingLayers();

    const dateInt: number | undefined = urlDate
      ? new Date(urlDate).setUTCHours(12, 0, 0, 0)
      : undefined;

    if (dateInt === selectedDate) {
      return;
    }

    if (!Number.isNaN(dateInt)) {
      mapState.actions.updateDateRange({ startDate: dateInt });
      updateHistory('date', getFormattedDate(dateInt, 'default') as string);
      return;
    }
    if (dateInt === undefined) {
      return;
    }

    dispatch(
      addNotification({
        message: t('Invalid date found {{date}}. Using most recent date', {
          date: urlDate,
        }),
        type: 'warning',
      }),
    );
  }, [
    addMissingLayers,
    baselineLayerIds,
    dispatch,
    hazardLayerIds,
    invalidLayersIds,
    selectedDate,
    serverAvailableDatesAreEmpty,
    updateHistory,
    urlDate,
    t,
    mapState.actions,
  ]);

  const removeLayerAndUpdateHistory = useCallback(
    (layerToRemove: LayerType, layerToKeep: LayerType) => {
      if (!selectedDate) {
        return;
      }
      // Remove layer from url.
      const urlLayerKey = getUrlKey(layerToRemove);
      removeLayerFromUrl(urlLayerKey, layerToRemove.id);
      mapState.actions.removeLayer(layerToRemove);

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
      mapState.actions,
      removeLayerFromUrl,
      selectedDate,
      serverAvailableDates,
      updateHistory,
    ],
  );

  // let users know if the selected layers cannot be viewed together.
  useEffect(() => {
    const nonBoundaryLayers = getNonBoundaryLayers(selectedLayers);

    // Check if any of the selected layers are currently loading their dates
    const hasLayersLoadingDates = nonBoundaryLayers.some(layer =>
      layersLoadingDates.includes(layer.id),
    );

    // Check if all layers with date support have their dates loaded
    // This prevents removing a layer before its dates are fully loaded
    // selectedLayersWithDateSupport already has dateItems calculated via getPossibleDatesForLayer
    // so we can simply check if dateItems is not empty
    const allLayersHaveDatesLoaded = selectedLayersWithDateSupport.every(
      layer => layer.dateItems && layer.dateItems.length > 0,
    );

    if (
      selectedLayerDates.length !== 0 ||
      // no layers using dates are active, date overlap is meaningless
      selectedLayersWithDateSupport.length === 0 ||
      !selectedDate ||
      // there are fewer than 2 layers, there can't be an overlap
      nonBoundaryLayers.length < 2 ||
      // not all dates have been loaded, we can't decide on overlaps yet
      hasLayersLoadingDates ||
      !allLayersHaveDatesLoaded
    ) {
      return;
    }

    // WARNING - This logic doesn't apply anymore if we order layers differently...
    const layerToRemove = nonBoundaryLayers[nonBoundaryLayers.length - 2];
    const layerToKeep = nonBoundaryLayers[nonBoundaryLayers.length - 1];

    dispatch(
      addNotification({
        message: t(
          'No dates overlap with the selected layers. Removing layer: {{layer}}',
          {
            layer: t(layerToRemove.title || layerToRemove.id),
          },
        ),
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
    selectedLayersWithDateSupport,
    layersLoadingDates,
    t,
  ]);

  const possibleDatesForLayerIncludeSelectedDate = useCallback(
    (layer: DateCompatibleLayer, date: Date) =>
      binaryIncludes<DateItem>(
        isAnticipatoryActionLayer(layer.type)
          ? AAAvailableDatesCombined
          : getPossibleDatesForLayer(layer, serverAvailableDates),
        date.setUTCHours(12, 0, 0, 0),
        x => new Date(x.displayDate).setUTCHours(12, 0, 0, 0),
      ),
    [AAAvailableDatesCombined, serverAvailableDates],
  );

  const checkSelectedDateForLayerSupport = useCallback(
    (providedSelectedDate?: number): number | null => {
      if (!providedSelectedDate || selectedLayerDates.length === 0) {
        return null;
      }
      let closestDate: number | null = null;
      selectedLayersWithDateSupport.forEach(layer => {
        const jsSelectedDate = new Date(providedSelectedDate);

        const AADatesLoaded =
          !isAnticipatoryActionLayer(layer.type) ||
          layer.id in serverAvailableDates;

        if (
          serverAvailableDatesAreEmpty ||
          possibleDatesForLayerIncludeSelectedDate(layer, jsSelectedDate) ||
          !AADatesLoaded
        ) {
          return;
        }

        closestDate = findClosestDate(providedSelectedDate, selectedLayerDates);

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

          dispatch(
            addNotification({
              message: t(
                'No data was found for layer "{{layerTitle}}" on {{selectedDate}}. The closest date {{closestDate}} has been loaded instead.',
                {
                  layerTitle: t(layer.title),
                  selectedDate: getFormattedDate(
                    jsSelectedDate,
                    DateFormat.Default,
                  ),
                  closestDate: getFormattedDate(
                    closestDate,
                    DateFormat.Default,
                  ),
                },
              ),
              type: 'warning',
            }),
          );
        }
      });
      return closestDate;
    },
    [
      dispatch,
      possibleDatesForLayerIncludeSelectedDate,
      selectedLayerDates,
      selectedLayersWithDateSupport,
      serverAvailableDates,
      serverAvailableDatesAreEmpty,
      updateHistory,
      t,
    ],
  );

  useEffect(() => {
    checkSelectedDateForLayerSupport(selectedDate);
  }, [checkSelectedDateForLayerSupport, selectedDate]);

  return {
    adminBoundariesExtent,
    areLayerDatesLoading,
    boundaryLayerId,
    numberOfActiveLayers,
    selectedLayerDates,
    selectedLayers,
    selectedLayersWithDateSupport,
    checkSelectedDateForLayerSupport,
  };
};

export default useLayers;
