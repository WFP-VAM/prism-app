import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'context/store';
import { AnticipatoryAction, DateItem } from 'config/types';
import { getAAConfig } from 'context/anticipatoryAction/config';
import { layersSelector, mapSelector } from 'context/mapStateSlice/selectors';
import { updateDateRange } from 'context/mapStateSlice';
import { getUrlKey, useUrlHistory } from 'utils/url-utils';
import { AALayerIds, LayerDefinitions, isWindowedDates } from 'config/utils';
import { getAAAvailableDatesCombined } from 'utils/server-utils';
import {
  availableDatesSelector,
  updateLayersCapabilities,
} from 'context/serverStateSlice';
import { AnticipatoryActionData } from 'context/anticipatoryAction/AADroughtStateSlice/types';
import { AAStormData } from 'context/anticipatoryAction/AAStormStateSlice/types';
import { toggleRemoveLayer } from '../layersPanel/MenuItem/MenuSwitch/SwitchItem/utils';

type AADataByAction<T extends AnticipatoryAction> =
  T extends AnticipatoryAction.storm
    ? AAStormData
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
  const serverAvailableDates = useSelector(availableDatesSelector);

  // Load data when component mounts
  useEffect(() => {
    dispatch(loadAAData());
  }, [dispatch, loadAAData]);

  useEffect(() => {
    if (AAAvailableDates) {
      const combinedAvailableDates = isWindowedDates(AAAvailableDates)
        ? getAAAvailableDatesCombined(AAAvailableDates)
        : AAAvailableDates;
      const updatedCapabilities = AALayerIds.reduce(
        (acc, layerId) => ({
          ...acc,
          [layerId]: combinedAvailableDates,
        }),
        { ...serverAvailableDates },
      );
      dispatch(updateLayersCapabilities(updatedCapabilities));
      dispatch(updateDateRange(updatedCapabilities));
    }
    // To avoid an infinite loop, we only want to run this effect when AAAvailableDates changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [AAAvailableDates]);

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    AAData: AAData as AADataByAction<T>,
    AAConfig,
    AAAvailableDates: AAAvailableDates as AAAvailableDatesByAction<T>,
  };
}
