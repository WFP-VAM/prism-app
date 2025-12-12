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

// Returns cyclones and their states for a given date, sorted by:
// 1) Most recent activation (activated_64kt/activated_48kt) closest to the selected date
// 2) If both have activation at the same recency (or none), higher max severity overall
// 3) If still tied, prefer the one whose latest state has higher severity
export const getWindStatesForDate = (
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

  // Sort: first by most recent activation relative to the selected date, then by severity
  const severityRank: Record<string, number> = {
    [WindState.monitoring]: 0,
    [WindState.ready]: 1,
    [WindState.activated_48kt]: 2,
    [WindState.activated_64kt]: 3,
  };

  const maxSeverity = (states: TimeAndState[]) =>
    states.reduce((max, s) => Math.max(max, severityRank[s.state] ?? 0), 0);

  const getLatestActivationTime = (states: TimeAndState[]): number | null => {
    // Find the latest time where state is an activation (48kt/64kt)
    const activations = states.filter(
      s =>
        s.state === WindState.activated_48kt ||
        s.state === WindState.activated_64kt,
    );
    if (activations.length === 0) {
      return null;
    }
    const latest = activations[activations.length - 1];
    return new Date(latest.ref_time).getTime();
  };

  const selectedTime = date ? new Date(date).getTime() : null;

  return unsorted.sort((a, b) => {
    if (selectedTime) {
      const aAct = getLatestActivationTime(a.states);
      const bAct = getLatestActivationTime(b.states);
      if (aAct !== null || bAct !== null) {
        // Prefer storms that have any activation
        if (aAct !== null && bAct === null) {
          return -1;
        }
        if (aAct === null && bAct !== null) {
          return 1;
        }
        if (aAct !== null && bAct !== null) {
          const aDist = Math.abs(selectedTime - aAct);
          const bDist = Math.abs(selectedTime - bAct);
          if (aDist !== bDist) {
            return aDist - bDist; // smaller distance (more recent) first
          }
        }
      }
    }
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
