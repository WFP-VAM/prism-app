import { AAWindStateReports } from 'context/anticipatoryAction/AAStormStateSlice';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getDateInUTC } from 'components/MapView/Layers/AnticipatoryActionStormLayer/utils';
import { datesAreEqualWithoutTime } from 'utils/date-utils';

export const useWindStatesByTime = (currentDate: number) => {
  const windStateReports = useSelector(AAWindStateReports);

  return useMemo(() => {
    const date = Object.keys(windStateReports).find(analysedDate => {
      const analysedDateInUTC = getDateInUTC(analysedDate, false);
      if (!analysedDateInUTC) {
        return false;
      }

      return datesAreEqualWithoutTime(analysedDateInUTC, currentDate);
    });

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
  }, [currentDate, windStateReports]);
};
