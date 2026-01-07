import React, { memo, useMemo } from 'react';
import 'react-datepicker/dist/react-datepicker.css';
import { DateItem, DateRangeType } from 'config/types';
import { datesAreEqualWithoutTime } from 'utils/date-utils';

const StandardTimelineItem = memo(
  ({
    concatenatedLayers,
    currentDate,
    dateItemStyling,
    isDateAvailable,
    selectedDate,
  }: StandardTimelineItemProps) => {
    // Find dates with priority: Query > Validity > Coverage
    // Validity periods are only shown for the active/selected date
    const isActiveDate = useMemo(
      () =>
        selectedDate !== undefined &&
        datesAreEqualWithoutTime(currentDate.value, selectedDate),
      [currentDate.value, selectedDate],
    );

    const layerMatches = useMemo(() => {
      return concatenatedLayers.map(layerDates => {
        // Priority 1: Query date - only show when queryDate matches currentDate AND it's an observation date
        // Observation dates (queryDate === displayDate) show as individual ticks
        const queryMatch = layerDates.findIndex(
          i =>
            datesAreEqualWithoutTime(i.queryDate, currentDate.value) &&
            datesAreEqualWithoutTime(i.queryDate, i.displayDate),
        );

        if (queryMatch > -1) {
          return { index: queryMatch, type: 'query' as const };
        }

        // Priority 2: Validity period - only show for active date
        // Check if displayDate matches currentDate (for the active date only)
        if (isActiveDate) {
          const validityMatch = layerDates.findIndex(i =>
            datesAreEqualWithoutTime(i.displayDate, currentDate.value),
          );

          if (validityMatch > -1) {
            return { index: validityMatch, type: 'validity' as const };
          }
        }

        // Priority 3: Coverage window - check if currentDate falls within startDate/endDate
        // This creates continuous bars instead of individual ticks
        const coverageMatch = layerDates.findIndex(i => {
          if (i.startDate && i.endDate) {
            return (
              currentDate.value >= i.startDate && currentDate.value <= i.endDate
            );
          }
          return false;
        });

        if (coverageMatch > -1) {
          return { index: coverageMatch, type: 'coverage' as const };
        }

        return { index: -1, type: 'none' as const };
      });
    }, [concatenatedLayers, currentDate.value, isActiveDate]);

    return (
      <>
        {/* Add a small grey line to indicate where dates are overlapping */}
        {layerMatches.filter(m => m.index > -1).length >= 1 &&
          isDateAvailable && (
            <div
              className={dateItemStyling[3].validityClass}
              style={{
                height: 4,
                // Position below all layers - each layer is 10px tall, so position at 10 * number of layers
                top: 10 * Math.min((layerMatches?.length || 0) + 1, 3),
              }}
              key={Math.random()}
              role="presentation"
            />
          )}
        {layerMatches.map((match, layerIndex) => {
          if (match.index === -1) {
            return null;
          }

          const layerDates = concatenatedLayers[layerIndex];
          const matchingDateItemInLayer: DateItem | undefined =
            layerDates[match.index];

          if (!matchingDateItemInLayer) {
            return null;
          }

          // Determine which class to use based on priority: Query > Validity > Coverage
          let className: string;
          if (
            match.type === 'query' &&
            dateItemStyling[layerIndex].queryClass
          ) {
            className = dateItemStyling[layerIndex].queryClass;
          } else if (match.type === 'validity') {
            className = dateItemStyling[layerIndex].validityClass;
          } else {
            className = dateItemStyling[layerIndex].coverageClass;
          }

          return (
            <React.Fragment key={Math.random()}>
              <div className={className} role="presentation" />
            </React.Fragment>
          );
        })}
      </>
    );
  },
);

export interface StandardTimelineItemProps {
  concatenatedLayers: DateItem[][];
  currentDate: DateRangeType;
  dateItemStyling: {
    validityClass: string;
    color: string;
    queryClass?: string;
    coverageClass: string;
  }[];
  isDateAvailable: boolean;
  selectedDate?: number;
}

export default StandardTimelineItem;
