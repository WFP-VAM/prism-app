import { useDispatch, useSelector } from 'react-redux';
import { AvailableDates } from '../config/types';
import { availableDatesSelector } from '../context/serverStateSlice';
import { dateRangeSelector } from '../context/mapStateSlice/selectors';
import { updateDateRange } from '../context/mapStateSlice';
/**
 * A hook designed to automatically load the default date of a layer if the user doesn't select one.
 * Returns either the user selected date or the default date, dispatching it to the date picker beforehand. Can also return undefined if no default date is available.
 * @param availableDatesLookupKey key to lookup in AvailableDates
 */
export function useDefaultDate(
  availableDatesLookupKey: keyof AvailableDates,
): number | undefined {
  const dispatch = useDispatch();
  const { startDate: selectedDate } = useSelector(dateRangeSelector);

  const possibleDates = useSelector(availableDatesSelector)[
    availableDatesLookupKey
  ];
  const defaultDate: number | undefined =
    possibleDates?.[possibleDates?.length - 1];

  if (!selectedDate && defaultDate) {
    dispatch(updateDateRange({ startDate: defaultDate }));
  }
  return selectedDate || defaultDate;
}
