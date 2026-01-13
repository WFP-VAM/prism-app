import { useMemo } from 'react';
import { FloodStation } from 'context/anticipatoryAction/AAFloodStateSlice/types';

/**
 * Filters flood stations based on the selected date.
 * Returns stations that match the selected date's forecast issue date.
 *
 * @param stationSummaryData - Map of station names to their summary data (contains all station info)
 * @param selectedDate - The selected date (Date object, ISO string, timestamp number) or null/undefined
 * @returns Filtered array of flood stations
 */
export function useFilteredFloodStations(
  stationSummaryData: Record<string, FloodStation | undefined>,
  selectedDate: Date | string | number | null | undefined,
): FloodStation[] {
  const selectedDateKey = selectedDate
    ? new Date(selectedDate).toISOString().split('T')[0]
    : null;

  return useMemo(() => {
    const stations = Object.values(stationSummaryData).filter(
      (station): station is FloodStation => station !== undefined,
    );

    if (!stations.length) {
      return [];
    }

    if (!selectedDateKey) {
      return stations;
    }

    return stations.filter((station: FloodStation) => {
      const issueDate = station.forecast_issue_date
        ? new Date(station.forecast_issue_date).toISOString().split('T')[0]
        : null;
      return issueDate === selectedDateKey;
    });
  }, [stationSummaryData, selectedDateKey]);
}
