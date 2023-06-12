export const datesAreEqualWithoutTime = (
  date1: number | Date,
  date2: number | Date,
): boolean => {
  return new Date(date1).toDateString() === new Date(date2).toDateString();
};
