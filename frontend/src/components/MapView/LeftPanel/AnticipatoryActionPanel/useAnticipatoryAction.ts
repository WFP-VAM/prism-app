import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'context/store';
import {
  AnticipatoryAction,
  DateItem,
  SelectedDateTimestamp,
} from 'config/types';
import { getAAConfig } from 'context/anticipatoryAction/config';
import {
  dateRangeSelector,
  layersSelector,
  mapSelector,
} from 'context/mapStateSlice/selectors';
import { updateDateRange } from 'context/mapStateSlice';
import { getUrlKey, useUrlHistory, UrlLayerKey } from 'utils/url-utils';
import {
  AALayerIds,
  LayerDefinitions,
  isWindowedDates,
  isAnticipatoryActionLayer,
} from 'config/utils';
import {
  getAAAvailableDatesCombined,
  getRequestDate,
} from 'utils/server-utils';
import {
  availableDatesSelector,
  updateLayersCapabilities,
} from 'context/serverStateSlice';
import { AnticipatoryActionData } from 'context/anticipatoryAction/AADroughtStateSlice/types';
import { ParsedStormData } from 'context/anticipatoryAction/AAStormStateSlice/parsedStormDataTypes';
import { AnticipatoryActionFloodState } from 'context/anticipatoryAction/AAFloodStateSlice/types';
import { loadAAFloodDateData } from 'context/anticipatoryAction/AAFloodStateSlice';
import { getFormattedDate } from 'utils/date-utils';
import { DateFormat } from 'utils/name-utils';
import { useMapState } from 'utils/useMapState';
import { isBoundaryLayer } from 'utils/boundary-layers-utils';
import { toggleRemoveLayer } from '../layersPanel/MenuItem/MenuSwitch/SwitchItem/utils';

type AADataByAction<T extends AnticipatoryAction> =
  T extends AnticipatoryAction.storm
    ? ParsedStormData
    : T extends AnticipatoryAction.flood
      ? AnticipatoryActionFloodState
      : Record<'Window 1' | 'Window 2', AnticipatoryActionData>;

type AAAvailableDatesByAction<T extends AnticipatoryAction> =
  T extends AnticipatoryAction.storm
    ? DateItem[]
    : T extends AnticipatoryAction.flood
      ? DateItem[]
      : Record<'Window 1' | 'Window 2', DateItem[]>;

export function useAnticipatoryAction<T extends AnticipatoryAction>(
  actionType: T,
): {
  AAData: AADataByAction<T>;
  AAConfig: any;
  AAAvailableDates: AAAvailableDatesByAction<T>;
} {
  const dispatch = useDispatch();
  const selectedLayers = useSelector(layersSelector);
  const map = useSelector(mapSelector);
  const {
    actions: { addLayer, removeLayer },
  } = useMapState();
  const { updateHistory, removeLayerFromUrl } = useUrlHistory();

  const AALayerInUrl = selectedLayers.find(x =>
    AALayerIds.includes(x.id as AnticipatoryAction),
  );
  const AAConfig = getAAConfig(actionType);
  const AAData = useSelector((state: RootState) =>
    AAConfig.dataSelector(state),
  );
  const AAAvailableDates = useSelector((state: RootState) =>
    AAConfig.availableDatesSelector(state),
  );
  const loadAAData = AAConfig.loadAction;
  const setFilters = AAConfig.setFiltersAction;
  const serverAvailableDates = useSelector(availableDatesSelector);
  const { startDate: selectedDate } = useSelector(dateRangeSelector);

  // Load data when component mounts
  useEffect(() => {
    dispatch(loadAAData());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Wait for AAAvailableDates to be loaded and have data before processing
    if (!AAAvailableDates) {
      return;
    }

    const combinedAvailableDates = isWindowedDates(AAAvailableDates)
      ? getAAAvailableDatesCombined(AAAvailableDates as any)
      : AAAvailableDates;

    // Only proceed if we have dates available
    if (
      Array.isArray(combinedAvailableDates) &&
      combinedAvailableDates.length === 0
    ) {
      return;
    }

    if (!selectedDate) {
      const updatedCapabilities = AALayerIds.reduce(
        (acc, layerId) => ({
          ...acc,
          [layerId]: combinedAvailableDates,
        }),
        { ...serverAvailableDates },
      );

      dispatch(updateLayersCapabilities(updatedCapabilities));

      // Set the most recent date as the default date for timeline advancement
      if (combinedAvailableDates && combinedAvailableDates.length > 0) {
        const mostRecentDate =
          combinedAvailableDates[combinedAvailableDates.length - 1].displayDate;
        dispatch(updateDateRange({ startDate: mostRecentDate }));
      }
    } else if (actionType === AnticipatoryAction.drought) {
      const queryDate = getRequestDate(
        combinedAvailableDates,
        selectedDate as SelectedDateTimestamp,
      );
      const date = getFormattedDate(queryDate, DateFormat.Default) as string;
      dispatch(setFilters({ selectedDate: date }));
    } else if (actionType === AnticipatoryAction.flood) {
      const queryDate = getRequestDate(
        combinedAvailableDates,
        selectedDate as SelectedDateTimestamp,
      );
      const date = getFormattedDate(queryDate, DateFormat.Default) as string;
      dispatch(loadAAFloodDateData({ date }));
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [AAAvailableDates, selectedDate]);

  // Handle URL updates when mounting/unmounting
  useEffect(() => {
    const layer = LayerDefinitions[actionType];

    if (AALayerInUrl?.id !== layer.id) {
      // Remove any existing AA layer
      if (AALayerInUrl) {
        toggleRemoveLayer(
          AALayerInUrl,
          map,
          getUrlKey(AALayerInUrl),
          removeLayer,
          removeLayerFromUrl,
          addLayer,
        );
      }

      // Remove all non-AA hazard layers (they share the HAZARD URL key with AA layers)
      // But preserve boundary layers
      const layerUrlKey = getUrlKey(layer);
      if (layerUrlKey === UrlLayerKey.HAZARD) {
        const nonAALayers = selectedLayers.filter(
          l =>
            getUrlKey(l) === UrlLayerKey.HAZARD &&
            !isAnticipatoryActionLayer(l.type) &&
            !isBoundaryLayer(l) &&
            l.id !== layer.id,
        );

        nonAALayers.forEach(layerToRemove => {
          toggleRemoveLayer(
            layerToRemove,
            map,
            getUrlKey(layerToRemove),
            removeLayer,
            removeLayerFromUrl,
            addLayer,
          );
        });
      }

      // Add the new AA layer to state
      addLayer(layer);

      // Update URL to only contain this layer
      // since we've already removed all other hazard layers
      updateHistory(getUrlKey(layer), layer.id);

      // Only reset date if there's no selected date
      // This preserves the timeline when switching between AA layers
      if (!selectedDate) {
        dispatch(updateDateRange({ startDate: undefined }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    AAData: AAData as AADataByAction<T>,
    AAConfig,
    AAAvailableDates: AAAvailableDates as AAAvailableDatesByAction<T>,
  };
}
