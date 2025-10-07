import { AAWindStateReports } from 'context/anticipatoryAction/AAStormStateSlice';
import { WindState } from 'prism-common';
import {
  TimeAndState,
  AAStormWindStateReports,
} from 'context/anticipatoryAction/AAStormStateSlice/types';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getDateInUTC } from 'components/MapView/Layers/AnticipatoryActionStormLayer/utils';
import { datesAreEqualWithoutTime } from 'utils/date-utils';
import { WindStateReport } from './types';

const getWindStatesForDate = (
  windStateReports: AAStormWindStateReports,
  date: string | null,
  cycloneName?: string,
): WindStateReport[] => {
  if (!date || !windStateReports[date]) {
    return [];
  }

  // If cycloneName is provided and exists in the data, return only that cyclone
  if (cycloneName && windStateReports[date]?.[cycloneName]) {
    return [
      {
        states: windStateReports[date][cycloneName] as TimeAndState[],
        cycloneName,
      },
    ];
  }

  // Return array of state objects for all available cyclones
  const unsorted: WindStateReport[] = Object.entries(
    windStateReports[date],
  ).map(([cycloneNameTemp, states]) => ({
    states: states as TimeAndState[],
    cycloneName: cycloneNameTemp,
  }));

  // Sort by closest to activation severity: activated_64kt > activated_48kt > ready > monitoring
  const severityRank: Record<string, number> = {
    [WindState.monitoring]: 0,
    [WindState.ready]: 1,
    [WindState.activated_48kt]: 2,
    [WindState.activated_64kt]: 3,
  };

  const maxSeverity = (states: TimeAndState[]) =>
    states.reduce((max, s) => Math.max(max, severityRank[s.state] ?? 0), 0);

  // eslint-disable-next-line fp/no-mutating-methods
  return unsorted.sort((a, b) => {
    const aMax = maxSeverity(a.states);
    const bMax = maxSeverity(b.states);
    if (aMax !== bMax) {
      return bMax - aMax;
    }
    // Tie-breaker: prefer the one whose latest state has higher severity
    const aLast = a.states[a.states.length - 1];
    const bLast = b.states[b.states.length - 1];
    const aLastRank = aLast ? (severityRank[aLast.state] ?? 0) : 0;
    const bLastRank = bLast ? (severityRank[bLast.state] ?? 0) : 0;
    if (aLastRank !== bLastRank) {
      return bLastRank - aLastRank;
    }
    return 0;
  });
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
