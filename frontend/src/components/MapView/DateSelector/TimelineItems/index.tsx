import {
  Fade,
  Grid,
  Tooltip,
  WithStyles,
  createStyles,
  withStyles,
} from '@material-ui/core';
import { CreateCSSProperties } from '@material-ui/styles';
import { compact, merge } from 'lodash';
import React, { memo, useCallback, useMemo } from 'react';
import { DateItem, DateRangeType } from 'config/types';
import { useSafeTranslation } from 'i18n';
import {
  DateCompatibleLayerWithDateItems,
  TIMELINE_ITEM_WIDTH,
} from 'components/MapView/DateSelector/utils';
import TimelineItem from './TimelineItem';
import TimelineLabel from './TimelineLabel';
import TooltipItem from './TooltipItem';

const TimelineItems = memo(
  ({
    classes,
    dateRange,
    clickDate,
    locale,
    selectedLayers,
  }: TimelineItemsProps) => {
    const { t } = useSafeTranslation();

    // Hard coded styling for date items (first, second, and third layers)
    const DATE_ITEM_STYLING: {
      class: string;
      color: string;
      layerDirectionClass?: string;
      emphasis?: string;
    }[] = [
      {
        class: classes.layerOneDate,
        color: '#C0E8FF',
        layerDirectionClass: classes.layerOneDirection,
        emphasis: classes.layerOneEmphasis,
      },
      {
        class: classes.layerTwoDate,
        color: '#FFF176',
        layerDirectionClass: classes.layerTwoDirection,
        emphasis: classes.layerTwoEmphasis,
      },
      {
        class: classes.layerThreeDate,
        color: '#F9CEC1',
        layerDirectionClass: classes.layerThreeDirection,
        emphasis: classes.layerThreeEmphasis,
      },
    ];

    const getTooltipTitle = useCallback(
      (date: DateRangeType): JSX.Element[] => {
        const tooltipTitleArray: JSX.Element[] = compact(
          selectedLayers.map((selectedLayer, layerIndex) => {
            return (
              <TooltipItem
                key={`Tootlip-${date.label}-${date.value}-${selectedLayer.title}`}
                layerTitle={t(selectedLayer.title)}
                color={DATE_ITEM_STYLING[layerIndex].color}
              />
            );
          }),
        );
        // eslint-disable-next-line fp/no-mutating-methods
        tooltipTitleArray.unshift(<div key={date.label}>{date.label}</div>);
        return tooltipTitleArray;
      },
      [DATE_ITEM_STYLING, selectedLayers, t],
    );

    const timelineStartDate: string = new Date(
      dateRange[0].value,
    ).toDateString();

    // We truncate layer by removing date that will not be drawn to the Timeline
    const truncatedLayers: DateItem[][] = useMemo(() => {
      // returns the index of the fist date in layer that match the first Timeline date
      const findLayerFirstDateIndex = (items: DateItem[]): number => {
        return items
          .map(d => new Date(d.displayDate).toDateString())
          .indexOf(timelineStartDate);
      };

      // For each selectedLayer truncate DateItem array
      return [...selectedLayers.map(layer => layer.dateItems)].map(
        (dateItemsForLayer: DateItem[]) => {
          const firstIndex = findLayerFirstDateIndex(dateItemsForLayer);
          if (firstIndex === -1) {
            return dateItemsForLayer;
          }

          // truncate the date item array at index matching timeline first date
          // eslint-disable-next-line fp/no-mutating-methods
          return dateItemsForLayer.slice(firstIndex, dateItemsForLayer.length);
        },
      );
    }, [selectedLayers, timelineStartDate]);

    // Draw a column for each date of the Timeline that start at the begining of the year
    return (
      <>
        {dateRange.map((date, index) => {
          return (
            <Tooltip
              key={`Root-${date.label}-${date.value}`}
              title={<>{getTooltipTitle(date)}</>}
              TransitionComponent={Fade}
              TransitionProps={{ timeout: 0 }}
              placement="top"
              arrow
            >
              <Grid
                item
                xs
                className={`${
                  date.isFirstDay ? classes.dateItemFull : classes.dateItem
                }`}
                onClick={() => clickDate(index)}
              >
                <TimelineLabel locale={locale} date={date} />
                <TimelineItem
                  concatenatedLayers={truncatedLayers}
                  currentDate={date}
                  dateItemStyling={DATE_ITEM_STYLING}
                />
              </Grid>
            </Tooltip>
          );
        })}
      </>
    );
  },
);

const DATE_ITEM_STYLES: CreateCSSProperties = {
  color: '#101010',
  borderLeft: '1px solid white',
  position: 'relative',
  top: -5,
  cursor: 'pointer',
  minWidth: TIMELINE_ITEM_WIDTH,
  '&:hover': {
    borderLeft: '1px solid #101010',
  },
};

const DEFAULT_ITEM: CreateCSSProperties = {
  position: 'absolute',
  height: 10,
  width: TIMELINE_ITEM_WIDTH,
  pointerEvents: 'none',
};

const BASE_DATE_ITEM: CreateCSSProperties = {
  ...DEFAULT_ITEM,
  opacity: 0.6,
};

const styles = () =>
  createStyles({
    dateItemFull: {
      ...DATE_ITEM_STYLES,
      borderLeft: '1px solid #101010',
      height: 36,
    },

    dateItem: merge(DATE_ITEM_STYLES, {
      '&:hover': {
        '& $dayItem': {
          borderLeft: 0,
        },
      },
    }),

    layerOneDate: {
      ...BASE_DATE_ITEM,
      top: 0,
      backgroundColor: '#C0E8FF',
    },
    layerTwoDate: {
      ...BASE_DATE_ITEM,
      top: 10,
      backgroundColor: '#FFF176',
    },
    layerThreeDate: {
      ...BASE_DATE_ITEM,
      top: 20,
      backgroundColor: '#F9CEC1',
    },

    layerOneEmphasis: {
      ...DEFAULT_ITEM,
      top: 0,
      backgroundColor: '#00A3FF',
    },
    layerTwoEmphasis: {
      ...DEFAULT_ITEM,
      top: 10,
      backgroundColor: '#FEC600',
    },
    layerThreeEmphasis: {
      ...DEFAULT_ITEM,
      top: 20,
      backgroundColor: '#FF9473',
    },

    layerOneDirection: {
      top: 0,
      borderLeft: '6px solid #00A3FF',
    },
    layerTwoDirection: {
      top: 10,
      borderLeft: '6px solid #FEC600',
    },
    layerThreeDirection: {
      top: 20,
      borderLeft: '6px solid #FF9473',
    },

    currentDate: {
      border: '2px solid black',
      top: '-7px',
      minWidth: '13.9px',
      maxHeight: '34.05px',
      '&:hover': {
        border: '2px solid black',
      },
    },
  });

export interface TimelineItemsProps extends WithStyles<typeof styles> {
  dateRange: DateRangeType[];
  clickDate: (arg: number) => void;
  locale: string;
  selectedLayers: DateCompatibleLayerWithDateItems[];
}

export default withStyles(styles)(TimelineItems);
