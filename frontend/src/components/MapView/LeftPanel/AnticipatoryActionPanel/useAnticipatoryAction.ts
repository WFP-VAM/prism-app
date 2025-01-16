import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'context/store';
import { AnticipatoryAction, DateItem } from 'config/types';
import { getAAConfig } from 'context/anticipatoryAction/config';
import {
  dateRangeSelector,
  layersSelector,
  mapSelector,
} from 'context/mapStateSlice/selectors';
import { updateDateRange } from 'context/mapStateSlice';
import { getUrlKey, useUrlHistory } from 'utils/url-utils';
import { AALayerIds, LayerDefinitions, isWindowedDates } from 'config/utils';
import {
  getAAAvailableDatesCombined,
  getRequestDate,
} from 'utils/server-utils';
import {
  availableDatesSelector,
  updateLayersCapabilities,
} from 'context/serverStateSlice';
import { AnticipatoryActionData } from 'context/anticipatoryAction/AADroughtStateSlice/types';
import { getFormattedDate } from 'utils/date-utils';
import { DateFormat } from 'utils/name-utils';
import { ParsedStormData } from 'context/anticipatoryAction/AAStormStateSlice/parsedStormDataTypes';
import { toggleRemoveLayer } from '../layersPanel/MenuItem/MenuSwitch/SwitchItem/utils';

type AADataByAction<T extends AnticipatoryAction> =
  T extends AnticipatoryAction.storm
    ? ParsedStormData
    : Record<'Window 1' | 'Window 2', AnticipatoryActionData>;

type AAAvailableDatesByAction<T extends AnticipatoryAction> =
  T extends AnticipatoryAction.storm
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
  const { updateHistory, appendLayerToUrl, removeLayerFromUrl } =
    useUrlHistory();

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
    if (AAAvailableDates) {
      const combinedAvailableDates = isWindowedDates(AAAvailableDates)
        ? getAAAvailableDatesCombined(AAAvailableDates)
        : AAAvailableDates;

      if (!selectedDate) {
        const updatedCapabilities = AALayerIds.reduce(
          (acc, layerId) => ({
            ...acc,
            [layerId]: combinedAvailableDates,
          }),
          { ...serverAvailableDates },
        );

        dispatch(updateLayersCapabilities(updatedCapabilities));
        dispatch(updateDateRange(updatedCapabilities));
      } else if (actionType === AnticipatoryAction.drought) {
        const queryDate = getRequestDate(combinedAvailableDates, selectedDate);
        const date = getFormattedDate(queryDate, DateFormat.Default) as string;
        dispatch(setFilters({ selectedDate: date }));
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [AAAvailableDates, selectedDate]);

  // Handle URL updates when mounting/unmounting
  useEffect(() => {
    const layer = LayerDefinitions[actionType];

    if (AALayerInUrl?.id !== layer.id) {
      if (AALayerInUrl) {
        toggleRemoveLayer(
          AALayerInUrl,
          map,
          getUrlKey(AALayerInUrl),
          dispatch,
          removeLayerFromUrl,
        );
      }
      const updatedUrl = appendLayerToUrl(
        getUrlKey(layer),
        selectedLayers,
        layer,
      );
      updateHistory(getUrlKey(layer), updatedUrl);
      dispatch(updateDateRange({ startDate: undefined }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    AAData: AAData as AADataByAction<T>,
    AAConfig,
    AAAvailableDates: AAAvailableDates as AAAvailableDatesByAction<T>,
  };
}
