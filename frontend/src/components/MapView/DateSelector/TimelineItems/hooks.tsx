import { AAWindStateReports } from 'context/anticipatoryAction/AAStormStateSlice';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getDateInUTC } from 'components/MapView/Layers/AnticipatoryActionStormLayer/utils';
import { datesAreEqualWithoutTime } from 'utils/date-utils';

const getWindStatesForDate = (windStateReports: any, date: string | null) => {
  if (!date) {
    return { states: [], cycloneName: null };
  }

  // TODO: Handle cases where multiple cyclones overlap in the same time period
  const firstAvailableCyclone = Object.keys(windStateReports[date])[0];
  if (!firstAvailableCyclone) {
    return { states: [], cycloneName: null };
  }

  return {
    states: windStateReports[date][firstAvailableCyclone],
    cycloneName: firstAvailableCyclone,
  };
};

export const useWindStatesByTime = (currentDate: number) => {
  const windStateReports = useSelector(AAWindStateReports);

  return useMemo(() => {
    if (!currentDate) {
      return { states: [], cycloneName: null };
    }

    const date = Object.keys(windStateReports).find(analysedDate => {
      const analysedDateInUTC = getDateInUTC(analysedDate, false);
      if (!analysedDateInUTC) {
        return false;
      }
      return datesAreEqualWithoutTime(analysedDateInUTC, currentDate);
    });

    return getWindStatesForDate(windStateReports, date || null);
  }, [currentDate, windStateReports]);
};

export const useLatestWindStates = () => {
  const windStateReports = useSelector(AAWindStateReports);

  return useMemo(() => {
    const dates = Object.keys(windStateReports);
    if (dates.length === 0) {
      return { states: [], cycloneName: null };
    }

    const latestDate = dates.reduce((latest, current) =>
      new Date(current) > new Date(latest) ? current : latest,
    );

    return getWindStatesForDate(windStateReports, latestDate);
  }, [windStateReports]);
};
