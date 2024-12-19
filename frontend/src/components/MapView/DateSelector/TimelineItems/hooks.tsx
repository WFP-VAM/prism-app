import {
  AADataSelector,
  AAWindStateReports,
} from 'context/anticipatoryAction/AAStormStateSlice';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getDateInUTC } from 'components/MapView/Layers/AnticipatoryActionStormLayer/utils';
import { datesAreEqualWithoutTime } from 'utils/date-utils';

export const useWindStatesByTime = (currentDate: number) => {
  const AAData = useSelector(AADataSelector);
  const windStateReports = useSelector(AAWindStateReports);
  const cycloneOfInterest = AAData.forecastDetails?.cyclone_name;

  return useMemo(() => {
    if (!cycloneOfInterest) {
      return [];
    }

    const date = Object.keys(windStateReports).find(analysedDate => {
      const analysedDateInUTC = getDateInUTC(analysedDate, false);
      if (!analysedDateInUTC) {
        return false;
      }

      return datesAreEqualWithoutTime(analysedDateInUTC, currentDate);
    });

    if (!date) {
      return [];
    }

    const foundCycloneName = Object.keys(windStateReports[date])
      .map(i => i.toLowerCase())
      .find(cycloneName => cycloneName === cycloneOfInterest.toLowerCase());

    if (!foundCycloneName) {
      return [];
    }

    return windStateReports[date][foundCycloneName];
  }, [cycloneOfInterest, currentDate, windStateReports]);
};
