import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import moment from 'moment';
import { AvailableDates, isMainLayer, LayerKey } from '../config/types';
import { availableDatesSelector } from '../context/serverStateSlice';
import {
  dateRangeSelector,
  layersSelector,
} from '../context/mapStateSlice/selectors';
import { USER_DATE_OFFSET } from '../components/MapView/DateSelector/utils';

import { useUrlHistory } from './url-utils';
import { DEFAULT_DATE_FORMAT } from './name-utils';

/**
 * A hook designed to automatically load the default date of a layer if the user doesn't select one.
 * Returns either the user selected date or the default date, dispatching it to the date picker beforehand. Can also return undefined if no default date is available.
 * @param availableDatesLookupKey key to lookup in AvailableDates
 */
export function useDefaultDate(
  availableDatesLookupKey: keyof AvailableDates,
  layerId?: LayerKey,
): number | undefined {
  const dispatch = useDispatch();
  const selectedLayers = useSelector(layersSelector);
  // check layer without group or main layer in group
  const mainLayer = isMainLayer(layerId as string, selectedLayers);
  const { startDate: selectedDate } = useSelector(dateRangeSelector);

  const { updateHistory } = useUrlHistory();

  const possibleDates = useSelector(availableDatesSelector)[
    availableDatesLookupKey
  ];

  const defaultDate: number | undefined =
    possibleDates?.[possibleDates?.length - 1]?.displayDate + USER_DATE_OFFSET;

  // React doesn't allow updating other components within another component
  // useEffect removes this error and updates DateSelector correctly in the lifecycle.
  useEffect(() => {
    if (!selectedDate && defaultDate && mainLayer) {
      updateHistory('date', moment(defaultDate).format(DEFAULT_DATE_FORMAT));
    }
  }, [defaultDate, dispatch, selectedDate, updateHistory, mainLayer]);

  return selectedDate || defaultDate;
}
