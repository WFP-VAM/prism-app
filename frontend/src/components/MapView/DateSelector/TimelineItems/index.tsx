import { Fade, Grid, Tooltip } from '@mui/material';
import { DateCompatibleLayerWithDateItems } from 'components/MapView/DateSelector/utils';
import { AnticipatoryAction, DateItem, DateRangeType } from 'config/types';
import { memo, useCallback } from 'react';

import AAFloodTimelineItem from './AAFloodTimelineItem';
import AAFloodTooltipContent from './AAFloodTooltipContent';
import AAStormTimelineItem from './AAStormTimelineItem';
import AAStormTooltipContent from './AAStormTooltipContent';
import StandardTimelineItem from './StandardTimelineItem';
import StandardTooltipContent from './StandardTooltipContent';
import {
  aaStormTooltipArrowSx,
  aaStormTooltipSx,
  availabilityDateSx,
  DATE_ITEM_STYLING,
  dateItemFullSx,
  dateItemSx,
  defaultTooltipSx,
} from './timelineItemsStyles';
import TimelineLabel from './TimelineLabel';

const TimelineItems = memo(
  ({
    dateRange,
    clickDate,
    locale,
    orderedLayers,
    truncatedLayers,
    availableDates,
    showDraggingCursor,
    selectedDate,
  }: TimelineItemsProps) => {
    const isShowingAAStormLayer = orderedLayers.some(
      layer => layer.id === AnticipatoryAction.storm,
    );

    const isShowingAAFloodLayer = orderedLayers.some(
      layer => layer.id === AnticipatoryAction.flood,
    );

    const getTooltipContent = useCallback(
      (date: DateRangeType) => {
        if (isShowingAAStormLayer) {
          return <AAStormTooltipContent date={date} />;
        }
        if (isShowingAAFloodLayer) {
          return <AAFloodTooltipContent date={date} />;
        }
        return (
          <StandardTooltipContent
            date={date}
            orderedLayers={orderedLayers}
            dateItemStyling={[...DATE_ITEM_STYLING]}
          />
        );
      },
      [isShowingAAStormLayer, isShowingAAFloodLayer, orderedLayers],
    );

    const availableDatesToDisplay = availableDates.filter(
      date => date >= dateRange[0].value,
    );

    const isAATooltip = isShowingAAStormLayer || isShowingAAFloodLayer;

    // Draw a column for each date of the Timeline that start at the beginning of the year
    return (
      <>
        {dateRange.map((date, index) => {
          const isDateAvailable = availableDatesToDisplay.includes(date.value);
          return (
            <Tooltip
              key={date.value}
              title={<>{getTooltipContent(date)}</>}
              slots={{ transition: Fade }}
              slotProps={{
                transition: { timeout: 0 },
                tooltip: {
                  sx: isAATooltip ? aaStormTooltipSx : defaultTooltipSx,
                },
                arrow: {
                  sx: isAATooltip ? aaStormTooltipArrowSx : undefined,
                },
              }}
              placement="top"
              arrow
              {...(isShowingAAStormLayer
                ? {
                    enterDelay: 300,
                    leaveDelay: 200,
                    interactive: true,
                  }
                : null)}
            >
              <Grid
                key={`Root-${date.label}-${date.value}`}
                size="grow"
                sx={date.isFirstDay ? dateItemFullSx : dateItemSx}
                onClick={() => clickDate(index)}
                data-date-index={index}
              >
                <div>
                  {(() => {
                    if (isShowingAAStormLayer) {
                      return <AAStormTimelineItem currentDate={date} />;
                    }
                    if (isShowingAAFloodLayer) {
                      return <AAFloodTimelineItem currentDate={date} />;
                    }
                    return (
                      <StandardTimelineItem
                        concatenatedLayers={truncatedLayers}
                        currentDate={date}
                        dateItemStyling={[...DATE_ITEM_STYLING]}
                        availabilitySx={availabilityDateSx}
                        isDateAvailable={isDateAvailable}
                        dateRange={dateRange}
                        selectedDate={selectedDate}
                      />
                    );
                  })()}
                </div>

                <TimelineLabel
                  locale={locale}
                  date={date}
                  showDraggingCursor={showDraggingCursor}
                />
              </Grid>
            </Tooltip>
          );
        })}
      </>
    );
  },
);

export interface TimelineItemsProps {
  dateRange: DateRangeType[];
  clickDate: (arg: number) => void;
  locale: string;
  availableDates: number[];
  orderedLayers: DateCompatibleLayerWithDateItems[];
  truncatedLayers: DateItem[][];
  showDraggingCursor: boolean;
  selectedDate: number;
}

export default TimelineItems;
