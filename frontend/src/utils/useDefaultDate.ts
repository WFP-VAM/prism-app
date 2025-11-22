import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { isMainLayer, LayerKey, SelectedDateTimestamp } from 'config/types';
import { availableDatesSelector } from 'context/serverStateSlice';
import {
  dateRangeSelector,
  layersSelector,
} from 'context/mapStateSlice/selectors';
import { updateDateRange } from 'context/mapStateSlice';

import { useUrlHistory } from './url-utils';
import { getFormattedDate } from './date-utils';

/**
 * A hook designed to automatically load the default date of a layer if the user doesn't select one.
 * Returns either the user selected date or the default date, dispatching it to the date picker beforehand. Can also return undefined if no default date is available.
 * @param availableDatesLookupKey key to lookup in AvailableDates
 */
export function useDefaultDate(
  layerId: LayerKey,
): SelectedDateTimestamp | undefined {
  const dispatch = useDispatch();
  const selectedLayers = useSelector(layersSelector);
  // check layer without group or main layer in group
  const mainLayer = isMainLayer(layerId as string, selectedLayers);
  const { startDate: selectedDate } = useSelector(dateRangeSelector);

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
      dispatch(updateDateRange({ startDate: defaultDate }));
    }
  }, [defaultDate, dispatch, selectedDate, updateHistory, mainLayer]);

  return (selectedDate as SelectedDateTimestamp) || defaultDate;
}
