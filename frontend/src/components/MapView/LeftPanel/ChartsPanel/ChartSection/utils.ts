// returns startDate and endDate as part of result
export function generateDateStrings(startDate: Date, endDate: Date) {
  const result = [];
  const interval = [1, 11, 21];
  const currentDate = new Date(startDate);
  currentDate.setUTCHours(12, 0, 0, 0);
  endDate.setUTCHours(12, 0, 0, 0);

  while (currentDate <= endDate) {
    for (let i = 0; i < 3; i++) {
      currentDate.setDate(interval[i]);
      const formattedDate = currentDate.toISOString().split('T')[0];

      if (currentDate > startDate && currentDate <= endDate) {
        result.push(formattedDate);
      }
    }

    currentDate.setDate(1);
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return result;
}
