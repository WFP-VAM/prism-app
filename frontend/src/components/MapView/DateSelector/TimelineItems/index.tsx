import { CSSProperties, memo, useCallback, useMemo } from 'react';
import {
  Fade,
  Grid,
  Tooltip,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import { AnticipatoryAction, DateItem, DateRangeType } from 'config/types';
import { grey } from 'muiTheme';
import {
  DateCompatibleLayerWithDateItems,
  TIMELINE_ITEM_WIDTH,
} from 'components/MapView/DateSelector/utils';
import TimelineLabel from './TimelineLabel';
import {
  DARK_BLUE_HEX,
  DARK_GREEN_HEX,
  DARK_ORANGE_HEX,
  LIGHT_BLUE_HEX,
  LIGHT_GREEN_HEX,
  LIGHT_ORANGE_HEX,
} from './utils';
import StandardTooltipContent from './StandardTooltipContent';
import AAStormTooltipContent from './AAStormTooltipContent';
import { DateItemStyle } from './types';
import AAStormTimelineItem from './AAStormTimelineItem';
import StandardTimelineItem from './StandardTimelineItem';
import AAFloodTooltipContent from './AAFloodTooltipContent';
import AAFloodTimelineItem from './AAFloodTimelineItem';

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
    const classes = useStyles();

    // Hard coded styling for date items (first, second, and third layers)
    const DATE_ITEM_STYLING: DateItemStyle[] = useMemo(
      () => [
        {
          color: LIGHT_BLUE_HEX,
          coverageBar: classes.layerOneCoverageBar,
          validityTick: classes.layerOneValidityTick,
          queryTick: classes.layerOneQueryTick,
        },
        {
          color: LIGHT_GREEN_HEX,
          coverageBar: classes.layerTwoCoverageBar,
          validityTick: classes.layerTwoValidityTick,
          queryTick: classes.layerTwoQueryTick,
        },
        {
          color: LIGHT_ORANGE_HEX,
          coverageBar: classes.layerThreeCoverageBar,
          validityTick: classes.layerThreeValidityTick,
          queryTick: classes.layerThreeQueryTick,
        },
      ],
      [classes],
    );

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
            dateItemStyling={DATE_ITEM_STYLING}
          />
        );
      },
      [
        isShowingAAStormLayer,
        isShowingAAFloodLayer,
        DATE_ITEM_STYLING,
        orderedLayers,
      ],
    );

    const availableDatesToDisplay = availableDates.filter(
      date => date >= dateRange[0].value,
    );

    // Draw a column for each date of the Timeline that start at the beginning of the year
    return (
      <>
        {dateRange.map((date, index) => {
          const isDateAvailable = availableDatesToDisplay.includes(date.value);
          return (
            <Tooltip
              key={date.value}
              title={<>{getTooltipContent(date)}</>}
              TransitionComponent={Fade}
              TransitionProps={{ timeout: 0 }}
              placement="top"
              arrow
              {...(isShowingAAStormLayer
                ? {
                    enterDelay: 300,
                    leaveDelay: 200,
                    interactive: true,
                  }
                : null)}
              classes={{
                tooltip:
                  isShowingAAStormLayer || isShowingAAFloodLayer
                    ? classes.AAStormTooltip
                    : classes.defaultTooltip,
                arrow:
                  isShowingAAStormLayer || isShowingAAFloodLayer
                    ? classes.AAStormTooltipArrow
                    : undefined,
              }}
            >
              <Grid
                key={`Root-${date.label}-${date.value}`}
                item
                xs
                className={`${
                  date.isFirstDay ? classes.dateItemFull : classes.dateItem
                }`}
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
                        dateItemStyling={DATE_ITEM_STYLING}
                        availabilityClass={classes.availabilityDate}
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

const createLayerStyles = (
  backgroundColor: CSSProperties['backgroundColor'],
  top: CSSProperties['top'],
): LayerStyle => ({
  position: 'absolute',
  height: 10,
  width: TIMELINE_ITEM_WIDTH,
  pointerEvents: 'none',
  opacity: 0.6,
  top,
  backgroundColor,
});

const createCoverageBarStyles = (
  backgroundColor: CSSProperties['backgroundColor'],
  top: CSSProperties['top'],
): CoverageBarStyle => ({
  position: 'absolute',
  height: 10,
  pointerEvents: 'none',
  opacity: 0.8,
  top,
  left: 0,
  backgroundColor,
});

const createValidityTickStyles = (
  backgroundColor: CSSProperties['backgroundColor'],
  top: CSSProperties['top'],
): TickStyle => ({
  position: 'absolute',
  height: 10,
  width: TIMELINE_ITEM_WIDTH,
  pointerEvents: 'none',
  opacity: 0.8,
  top,
  backgroundColor,
});

const createQueryDateTickStyles = (
  backgroundColor: CSSProperties['backgroundColor'],
  top: CSSProperties['top'],
): TickStyle => ({
  position: 'absolute',
  height: 10,
  width: TIMELINE_ITEM_WIDTH,
  pointerEvents: 'none',
  opacity: 1,
  top,
  backgroundColor,
});

const useStyles = makeStyles(() =>
  createStyles({
    dateItemFull: {
      color: '#101010',
      position: 'relative',
      top: -5,
      cursor: 'pointer',
      minWidth: TIMELINE_ITEM_WIDTH,
      borderLeft: '1px solid #101010',
      height: 36,
    },
    // dayItem is set in TimelineLabel.tsx
    dayItem: {},
    dateItem: {
      color: '#101010',
      position: 'relative',
      top: -5,
      cursor: 'pointer',
      minWidth: TIMELINE_ITEM_WIDTH,
      // Set a transparent border to prevent layout shifts when the border color changes on hover.
      // Do not remove this unless you are sure layout shifts will not occur.
      borderLeft: '1px solid transparent',
      '&:hover': {
        borderLeft: '1px solid #101010',
        '& $dayItem': {
          borderLeft: 0,
        },
      },
    },
    defaultTooltip: {
      backgroundColor: '#222222',
      opacity: '0.85 !important',
      maxWidth: 'none',
    },
    AAStormTooltip: {
      backgroundColor: '#FFFFFF',
      border: '1px solid #D3D3D3',
      maxWidth: 'none',
    },
    availabilityDate: createLayerStyles(grey, 0),

    // Coverage bars
    layerOneCoverageBar: createCoverageBarStyles(LIGHT_BLUE_HEX, 0),
    layerTwoCoverageBar: createCoverageBarStyles(LIGHT_GREEN_HEX, 10),
    layerThreeCoverageBar: createCoverageBarStyles(LIGHT_ORANGE_HEX, 20),

    // Validity ticks
    layerOneValidityTick: createValidityTickStyles(LIGHT_BLUE_HEX, 0),
    layerTwoValidityTick: createValidityTickStyles(LIGHT_GREEN_HEX, 10),
    layerThreeValidityTick: createValidityTickStyles(LIGHT_ORANGE_HEX, 20),

    // Query date ticks (bold)
    layerOneQueryTick: createQueryDateTickStyles(DARK_BLUE_HEX, 0),
    layerTwoQueryTick: createQueryDateTickStyles(DARK_GREEN_HEX, 10),
    layerThreeQueryTick: createQueryDateTickStyles(DARK_ORANGE_HEX, 20),

    currentDate: {
      border: '2px solid black',
      top: '-7px',
      minWidth: '13.9px',
      maxHeight: '34.05px',
      '&:hover': {
        border: '2px solid black',
      },
    },

    AAStormTooltipArrow: {
      width: '11px',
      height: '11px',
      bottom: '-1px !important',
      '&::before': {
        width: '8px',
        height: '8px',
        backgroundColor: 'white',
        transformOrigin: 'center !important',
        boxSizing: 'border-box',
        borderWidth: '0px 1px 1px 0px',
        borderColor: '#D3D3D3',
        borderStyle: 'solid',
      },
    },
  }),
);

type LayerStyle = {
  position: CSSProperties['position'];
  height: CSSProperties['height'];
  width: CSSProperties['width'];
  pointerEvents: CSSProperties['pointerEvents'];
  opacity: CSSProperties['opacity'];
  top: CSSProperties['top'];
  backgroundColor: CSSProperties['backgroundColor'];
};

type CoverageBarStyle = {
  position: CSSProperties['position'];
  height: CSSProperties['height'];
  pointerEvents: CSSProperties['pointerEvents'];
  opacity: CSSProperties['opacity'];
  top: CSSProperties['top'];
  left: CSSProperties['left'];
  backgroundColor: CSSProperties['backgroundColor'];
};

type TickStyle = {
  position: CSSProperties['position'];
  height: CSSProperties['height'];
  width: CSSProperties['width'];
  pointerEvents: CSSProperties['pointerEvents'];
  opacity: CSSProperties['opacity'];
  top: CSSProperties['top'];
  backgroundColor: CSSProperties['backgroundColor'];
};

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
