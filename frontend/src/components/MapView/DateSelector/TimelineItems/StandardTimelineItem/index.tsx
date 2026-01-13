import React, { memo, useMemo } from 'react';
import 'react-datepicker/dist/react-datepicker.css';
import { DateItem, DateRangeType } from 'config/types';
import { datesAreEqualWithoutTime } from 'utils/date-utils';
import { DateItemStyle } from '../types';

const StandardTimelineItem = memo(
  ({
    concatenatedLayers,
    currentDate,
    dateItemStyling,
    availabilityClass,
    isDateAvailable,
    dateRange,
    selectedDate,
  }: StandardTimelineItemProps) => {
    // Pre-compute the matching indices for all layers
    const displayDateMatches = useMemo(
      () =>
        concatenatedLayers.map(layerDates =>
          layerDates.findIndex(i =>
            datesAreEqualWithoutTime(i.displayDate, currentDate.value),
          ),
        ),
      [concatenatedLayers, currentDate.value],
    );

    const layerMatches = useMemo(() => {
      const queryDateMatches = concatenatedLayers.map(layerDates =>
        layerDates.findIndex(i =>
          datesAreEqualWithoutTime(i.queryDate, currentDate.value),
        ),
      );

      return displayDateMatches.map((displayDateMatch, layerIndex) =>
        queryDateMatches[layerIndex] > -1 &&
        !datesAreEqualWithoutTime(
          concatenatedLayers[layerIndex][displayDateMatch].queryDate,
          currentDate.value,
        )
          ? queryDateMatches[layerIndex]
          : displayDateMatch,
      );
    }, [concatenatedLayers, currentDate.value, displayDateMatches]);

    // Pre-compute coverage data for each layer's selected date (computed once per render)
    const layerCoverageData = useMemo(() => {
      if (dateRange.length === 0) {
        return concatenatedLayers.map(() => ({
          clampedStartDate: null,
          clampedEndDate: null,
        }));
      }

      const timelineStart = dateRange[0].value;
      const timelineEnd = dateRange[dateRange.length - 1].value;

      return concatenatedLayers.map(layerDates => {
        // Find selectedDateItem once per layer (not per date)
        const selectedDateItem = layerDates.find(item =>
          datesAreEqualWithoutTime(item.displayDate, selectedDate),
        );

        if (
          !selectedDateItem ||
          !selectedDateItem.startDate ||
          !selectedDateItem.endDate
        ) {
          return {
            clampedStartDate: null,
            clampedEndDate: null,
          };
        }

        // Clamp coverage window to visible timeline bounds
        const clampedStartDate = Math.max(
          selectedDateItem.startDate,
          timelineStart,
        );
        const clampedEndDate = Math.min(selectedDateItem.endDate, timelineEnd);

        // Only return valid coverage if clamped window is valid
        if (clampedStartDate > clampedEndDate) {
          return {
            clampedStartDate: null,
            clampedEndDate: null,
          };
        }

        return {
          clampedStartDate,
          clampedEndDate,
        };
      });
    }, [concatenatedLayers, selectedDate, dateRange]);

    const isQueryDate = (date: DateItem): boolean =>
      datesAreEqualWithoutTime(date.queryDate, date.displayDate);

    return (
      <>
        {/* Add a small grey line to indicate where dates are overlapping */}
        {layerMatches.length >= 1 && isDateAvailable && (
          <div
            className={availabilityClass}
            style={{
              height: 4,
              // TODO - handle more than 3 layers
              top: 10 * Math.min((layerMatches?.length || 0) + 1, 3),
            }}
            key={Math.random()}
            role="presentation"
          />
        )}
        {layerMatches.map((idx, layerIndex) => {
          const layerDates = concatenatedLayers[layerIndex];
          const matchingDateItemInLayer: DateItem | undefined =
            idx > -1 ? layerDates[idx] : undefined;

          const coverageData = layerCoverageData[layerIndex];
          const { clampedStartDate, clampedEndDate } = coverageData;

          // Check if current timeline date falls within the clamped coverage window
          const isInSelectedCoverage =
            clampedStartDate !== null &&
            clampedEndDate !== null &&
            currentDate.value >= clampedStartDate &&
            currentDate.value <= clampedEndDate;

          // Determine what to render with priority: query > validity > coverage
          const hasQueryTick =
            matchingDateItemInLayer !== undefined &&
            isQueryDate(matchingDateItemInLayer);
          const hasValidityTick =
            matchingDateItemInLayer !== undefined && !hasQueryTick;
          const hasCoverageTick =
            isInSelectedCoverage && !hasQueryTick && !hasValidityTick;

          // Skip if nothing to render
          if (!hasQueryTick && !hasValidityTick && !hasCoverageTick) {
            return null;
          }

          // Determine which tick class to use based on priority
          let tickClassName: string | undefined;
          if (hasQueryTick) {
            tickClassName = dateItemStyling[layerIndex].queryTick;
          } else if (hasValidityTick) {
            tickClassName = dateItemStyling[layerIndex].validityTick;
          } else if (hasCoverageTick) {
            tickClassName = dateItemStyling[layerIndex].coverageTick;
          }

          return (
            <React.Fragment key={`layer-${layerIndex}-${currentDate.value}`}>
              {tickClassName && (
                <div className={tickClassName} role="presentation" />
              )}
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
  dateItemStyling: DateItemStyle[];
  availabilityClass?: string;
  isDateAvailable: boolean;
  dateRange: DateRangeType[];
  selectedDate: number;
}

export default StandardTimelineItem;
