import { AADataSelector } from 'context/anticipatoryAction/AAStormStateSlice';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getDateInUTC } from 'components/MapView/Layers/AnticipatoryActionStormLayer/utils';
import { datesAreEqualWithoutTime } from 'utils/date-utils';
import { DateJSON } from './types';
import dateJSON from '../../../../../public/data/mozambique/anticipatory-action/date_temporary.json';

export const useWindStatesByTime = (currentDate: number) => {
  const AAData = useSelector(AADataSelector);
  const cycloneOfInterest = AAData.forecastDetails?.cyclone_name;

  return useMemo(() => {
    if (!cycloneOfInterest) {
      return [];
    }

    const date = Object.keys(dateJSON as DateJSON).find(analysedDate => {
      const analysedDateInUTC = getDateInUTC(analysedDate, false);
      if (!analysedDateInUTC) {
        return false;
      }

      return datesAreEqualWithoutTime(analysedDateInUTC, currentDate);
    });

    if (!date) {
      return [];
    }

    const foundCycloneName = Object.keys((dateJSON as DateJSON)[date])
      .map(i => i.toLowerCase())
      .find(cycloneName => cycloneName === cycloneOfInterest.toLowerCase());

    if (!foundCycloneName) {
      return [];
    }

    return (dateJSON as DateJSON)[date][foundCycloneName];
  }, [cycloneOfInterest, currentDate]);
};
