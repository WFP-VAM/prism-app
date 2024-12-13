import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'context/store';
import { AnticipatoryAction } from 'config/types';
import { getAAConfig } from 'context/anticipatoryAction/config';
import { layersSelector, mapSelector } from 'context/mapStateSlice/selectors';
import { updateDateRange } from 'context/mapStateSlice';
import { getUrlKey, useUrlHistory } from 'utils/url-utils';
import {
  AALayerIds,
  LayerDefinitions,
  isWindowEmpty,
  isWindowedDates,
} from 'config/utils';
import { getAAAvailableDatesCombined } from 'utils/server-utils';
import {
  availableDatesSelector,
  updateLayersCapabilities,
} from 'context/serverStateSlice';
import { toggleRemoveLayer } from '../layersPanel/MenuItem/MenuSwitch/SwitchItem/utils';

export function useAnticipatoryAction(actionType: AnticipatoryAction) {
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
  }, [AAAvailableDates, dispatch]);

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

    return () => {
      if (isWindowEmpty(AAData, 'Window 1')) {
        toggleRemoveLayer(
          layer,
          map,
          getUrlKey(layer),
          dispatch,
          removeLayerFromUrl,
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    AAData,
    AAConfig,
  };
}
