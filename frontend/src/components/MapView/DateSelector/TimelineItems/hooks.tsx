import { AAWindStateReports } from 'context/anticipatoryAction/AAStormStateSlice';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getDateInUTC } from 'components/MapView/Layers/AnticipatoryActionStormLayer/utils';
import { datesAreEqualWithoutTime } from 'utils/date-utils';
import { WindStateReport } from './types';

const getWindStatesForDate = (
  windStateReports: any,
  date: string | null,
  cycloneName?: string,
) => {
  if (!date || !windStateReports[date]) {
    return [];
  }

  // If cycloneName is provided and exists in the data, return only that cyclone
  if (cycloneName && windStateReports[date]?.[cycloneName]) {
    return [
      {
        states: windStateReports[date][cycloneName],
        cycloneName,
      },
    ];
  }

  // Return array of state objects for all available cyclones
  return Object.entries(windStateReports[date]).map(
    ([cycloneNameTemp, states]) => ({
      states,
      cycloneName: cycloneNameTemp,
    }),
  );
};

export const useWindStatesByTime = (
  currentDate: number,
  cycloneName?: string,
): WindStateReport[] => {
  const windStateReports = useSelector(AAWindStateReports);

  return useMemo(() => {
    const dates = Object.keys(windStateReports);
    if (dates.length === 0) {
      return [];
    }

    // If currentDate is 0 or null, get the latest report
    if (!currentDate) {
      const latestDate = dates.reduce((latest, current) =>
        new Date(current) > new Date(latest) ? current : latest,
      );
      return getWindStatesForDate(windStateReports, latestDate, cycloneName);
    }

    const date = Object.keys(windStateReports).find(analyzedDate => {
      const analyzedDateInUTC = getDateInUTC(analyzedDate, false);
      if (!analyzedDateInUTC) {
        return false;
      }
      const isEqual = datesAreEqualWithoutTime(analyzedDateInUTC, currentDate);
      return isEqual;
    });

    const result = getWindStatesForDate(
      windStateReports,
      date || null,
      cycloneName,
    );
    return result;
  }, [currentDate, windStateReports, cycloneName]);
};
