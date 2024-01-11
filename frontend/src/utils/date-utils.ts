import moment, { Moment } from 'moment';
import { DateItem } from '../config/types';

export interface StartEndDate {
  startDate?: number;
  endDate?: number;
}

export const datesAreEqualWithoutTime = (
  date1: number | Date,
  date2: number | Date,
): boolean => {
  const d1 = new Date(date1).setHours(0, 0, 0, 0);
  const d2 = new Date(date2).setHours(0, 0, 0, 0);
  return d1 === d2;
};

export const generateDatesRange = (
  startDate: Moment,
  endDate: Moment,
): number[] => {
  return Array.from(
    { length: endDate.diff(startDate, 'days') + 1 },
    (_, index) => startDate.clone().add(index, 'days').valueOf(),
  );
};

export const generateDateItemsRange = (
  startEndDateList: StartEndDate[],
): DateItem[] => {
  if (startEndDateList.length === 0) {
    return [];
  }

  return startEndDateList.flatMap(range => {
    const datesInTime: number[] = generateDatesRange(
      moment(range.startDate),
      moment(range.endDate),
    );

    const dateItems: DateItem[] = datesInTime.map(dateInTime => ({
      displayDate: dateInTime,
      queryDate: range.startDate!,
    }));

    // eslint-disable-next-line fp/no-mutation
    dateItems[0].isStartDate = true;
    // eslint-disable-next-line fp/no-mutation
    dateItems[dateItems.length - 1].isEndDate = true;

    return dateItems;
  });
};
