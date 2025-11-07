import { useMemo } from 'react';
import { FloodStation } from 'context/anticipatoryAction/AAFloodStateSlice/types';

/**
 * Filters flood stations based on the selected date.
 * Returns stations that match the selected date's forecast issue date.
 *
 * @param stations - Array of flood stations to filter
 * @param stationSummaryData - Map of station names to their summary data
 * @param selectedDate - The selected date (Date object, ISO string, timestamp number) or null/undefined
 * @returns Filtered array of flood stations
 */
export function useFilteredFloodStations(
  stations: FloodStation[],
  stationSummaryData: Record<string, FloodStation | undefined>,
  selectedDate: Date | string | number | null | undefined,
): FloodStation[] {
  const selectedDateKey = selectedDate
    ? new Date(selectedDate).toISOString().split('T')[0]
    : null;

  return useMemo(() => {
    if (!stations.length) {
      return [];
    }

    return stations.filter((station: FloodStation) => {
      if (!selectedDateKey) {
        return true;
      }
      const stationSummary = stationSummaryData?.[station.station_name];
      const issueDate = stationSummary?.forecast_issue_date
        ? new Date(stationSummary.forecast_issue_date)
            .toISOString()
            .split('T')[0]
        : null;
      return issueDate === selectedDateKey;
    });
  }, [stations, stationSummaryData, selectedDateKey]);
}
