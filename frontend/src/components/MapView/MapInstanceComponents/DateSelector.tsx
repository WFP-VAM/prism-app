// frontend/src/components/MapView/MapInstanceComponents/MapInstanceDateSelector.tsx
import React, { memo, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { FormControl, Select, MenuItem, Typography } from '@material-ui/core';
import { getFormattedDate } from 'utils/date-utils';
import {
  DateCompatibleLayer,
  getPossibleDatesForLayer,
} from 'utils/server-utils';
import { DateItem } from 'config/types';
import { RootState } from 'context/store';
import { availableDatesSelector } from 'context/serverStateSlice';
import {
  useMapInstanceActions,
  useMapInstanceSelectors,
} from '../MapInstanceContext';

interface MapInstanceDateSelectorProps {
  layerId: string; // The layer to get dates for
}

const MapInstanceDateSelector = memo(
  ({ layerId }: MapInstanceDateSelectorProps) => {
    const { updateDateRange } = useMapInstanceActions();
    const { selectDateRange, selectLayers } = useMapInstanceSelectors();
    const serverAvailableDates = useSelector(availableDatesSelector);

    // Get the layer from the map instance using useSelector
    const layers = useSelector((state: RootState) => selectLayers(state));
    const layer = layers.find(l => l.id === layerId);

    // Get current date range for this map instance using useSelector
    const dateRange = useSelector((state: RootState) => selectDateRange(state));
    const currentDate = dateRange.startDate;

    // Get available dates for this layer
    const availableDates = useMemo(() => {
      if (!layer) {
        return [];
      }
      return getPossibleDatesForLayer(
        layer as DateCompatibleLayer,
        serverAvailableDates,
      );
    }, [layer, serverAvailableDates]);

    const handleDateChange = useCallback(
      (event: React.ChangeEvent<{ value: unknown }>) => {
        const newDate = event.target.value as number;
        updateDateRange({ startDate: newDate });
      },
      [updateDateRange],
    );

    if (!layer || availableDates.length === 0) {
      return (
        <Typography variant="body2" color="textSecondary">
          No dates available for this layer
        </Typography>
      );
    }

    return (
      <FormControl fullWidth size="small">
        <Select
          value={
            currentDate ||
            availableDates[availableDates.length - 1]?.displayDate ||
            ''
          }
          onChange={handleDateChange}
          displayEmpty
        >
          {availableDates.map((dateItem: DateItem) => (
            <MenuItem key={dateItem.displayDate} value={dateItem.displayDate}>
              {getFormattedDate(dateItem.displayDate, 'default')}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  },
);

export default MapInstanceDateSelector;
