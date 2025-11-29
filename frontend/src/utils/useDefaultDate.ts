import { useDispatch, useSelector } from 'context/hooks';
import { useEffect } from 'react';
import { isMainLayer, LayerKey, SelectedDateTimestamp } from 'config/types';
import { availableDatesSelector } from 'context/serverStateSlice';

import { useUrlHistory } from './url-utils';
import { getFormattedDate } from './date-utils';
import { useMapState } from './useMapState';

/**
 * A hook designed to automatically load the default date of a layer if the user doesn't select one.
 * Returns either the user selected date or the default date, dispatching it to the date picker beforehand. Can also return undefined if no default date is available.
 * @param availableDatesLookupKey key to lookup in AvailableDates
 */
export function useDefaultDate(
  layerId: LayerKey,
): SelectedDateTimestamp | undefined {
  const dispatch = useDispatch();
  const { dateRange, layers, ...mapState } = useMapState();
  // check layer without group or main layer in group
  const mainLayer = isMainLayer(layerId as string, layers);
  const { startDate: selectedDate } = dateRange;

  const { updateHistory } = useUrlHistory();

  // TODO - use getPossibleDatesForLayer
  const possibleDates = useSelector(availableDatesSelector)[layerId];

  const defaultDate: SelectedDateTimestamp | undefined = possibleDates?.[
    (possibleDates?.length || 0) - 1
  ]?.displayDate as unknown as SelectedDateTimestamp;

  // React doesn't allow updating other components within another component
  // useEffect removes this error and updates DateSelector correctly in the lifecycle.
  useEffect(() => {
    if (!selectedDate && defaultDate && mainLayer) {
      // Update both URL and Redux state to ensure DateSelector re-renders properly
      updateHistory('date', getFormattedDate(defaultDate, 'default') as string);
      if (!mapState.isGlobalMap) {
        mapState.actions.updateDateRange({ startDate: defaultDate });
      }
    }
  }, [
    defaultDate,
    dispatch,
    selectedDate,
    updateHistory,
    mainLayer,
    mapState.isGlobalMap,
    mapState.actions,
  ]);

  return (selectedDate as SelectedDateTimestamp) || defaultDate;
}
