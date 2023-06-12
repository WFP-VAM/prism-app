import {
  Fade,
  Grid,
  Tooltip,
  Typography,
  WithStyles,
  createStyles,
  withStyles,
} from '@material-ui/core';
import { CreateCSSProperties } from '@material-ui/styles';
import { compact, merge } from 'lodash';
import React, { memo, useCallback, useMemo } from 'react';
import { DateItem, DateRangeType } from '../../../../config/types';
import { moment, useSafeTranslation } from '../../../../i18n';
import { MONTH_YEAR_DATE_FORMAT } from '../../../../utils/name-utils';
import {
  DateCompatibleLayerWithDateItems,
  TIMELINE_ITEM_WIDTH,
} from '../utils';
import TimelineItem from './TimelineItem';
import TooltipItem from './TooltipItem';

const TimelineItems = memo(
  ({
    classes,
    intersectionDates,
    dateRange,
    clickDate,
    locale,
    selectedLayers,
  }: TimelineItemsProps) => {
    const { t } = useSafeTranslation();

    const selectedLayerDateItems: DateItem[][] = useMemo(
      () =>
        selectedLayers.map(layer => {
          return layer.dateItems;
        }),
      [selectedLayers],
    );

    // Hard coded styling for date items (first, second, and third layers)
    const DATE_ITEM_STYLING: {
      class: string;
      color: string;
      layerDirectionClass?: string;
    }[] = [
      { class: classes.intersectionDate, color: 'White' },
      {
        class: classes.layerOneDate,
        color: 'Blue',
        layerDirectionClass: classes.layerOneDirection,
      },
      {
        class: classes.layerTwoDate,
        color: 'Yellow',
        layerDirectionClass: classes.layerTwoDirection,
      },
      {
        class: classes.layerThreeDate,
        color: 'Red',
        layerDirectionClass: classes.layerThreeDirection,
      },
      // For now, super-impose additional layers in case we have too many.
      // TODO - handle this more cleanly.
      { class: classes.layerThreeDate, color: 'Blue' },
      { class: classes.layerThreeDate, color: 'Yellow' },
    ];

    const intersectionDateItems: DateItem[] = intersectionDates.map(date => ({
      displayDate: date,
      queryDate: date,
    }));

    const getTooltipTitle = useCallback(
      (date: DateRangeType, index): JSX.Element[] => {
        const tooltipTitleArray: JSX.Element[] = compact(
          selectedLayers.map((selectedLayer, layerIndex) => {
            if (
              selectedLayer.dateItems &&
              selectedLayer.dateItems[index] &&
              selectedLayer.dateItems[index].displayDate === date.value
            ) {
              return undefined;
            }
            return (
              <TooltipItem
                key={selectedLayer.title}
                layerTitle={t(selectedLayer.title)}
                color={DATE_ITEM_STYLING[layerIndex + 1].color}
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

    const renderDateItemLabel = useCallback(
      (date: DateRangeType) => {
        if (date.isFirstDay) {
          return (
            <Typography variant="body2" className={classes.dateItemLabel}>
              {moment(date.value).locale(locale).format(MONTH_YEAR_DATE_FORMAT)}
            </Typography>
          );
        }
        return <div className={classes.dayItem} />;
      },
      [classes.dateItemLabel, classes.dayItem, locale],
    );

    const timelineStartDate: string = useMemo(
      () => new Date(dateRange[0].value).toDateString(),
      [dateRange],
    );

    const concatenatedLayers: DateItem[][] = useMemo(() => {
      return [intersectionDateItems, ...selectedLayerDateItems].map(
        (dateItemsForLayer: DateItem[]) => {
          const firstIndex = dateItemsForLayer
            .map(d => new Date(d.displayDate).toDateString())
            .indexOf(timelineStartDate);
          if (firstIndex === -1) {
            return dateItemsForLayer;
          }

          // eslint-disable-next-line fp/no-mutating-methods
          return dateItemsForLayer.slice(
            firstIndex,
            dateItemsForLayer.length - 1,
          );
        },
      );
    }, [intersectionDateItems, selectedLayerDateItems, timelineStartDate]);

    return (
      <>
        {dateRange.map((date, index) => (
          <Tooltip
            title={<div>{getTooltipTitle(date, index)}</div>}
            key={`Root-${date.label}-${date.value}`}
            TransitionComponent={Fade}
            TransitionProps={{ timeout: 0 }}
            placement="top"
            arrow
          >
            <Grid
              item
              xs
              className={
                date.isFirstDay ? classes.dateItemFull : classes.dateItem
              }
            >
              {renderDateItemLabel(date)}
              <TimelineItem
                concatenatedLayers={concatenatedLayers}
                currentDate={date}
                index={index}
                clickDate={clickDate}
                dateItemStyling={DATE_ITEM_STYLING}
              />
            </Grid>
          </Tooltip>
        ))}
      </>
    );
  },
);

const DATE_ITEM_STYLES: CreateCSSProperties = {
  borderTop: '1px solid white',
  color: 'white',
  position: 'relative',
  top: -5,
  cursor: 'pointer',
  minWidth: TIMELINE_ITEM_WIDTH,
  '&:hover': {
    borderLeft: '1px solid #5ccfff',
  },
};

const BASE_DATE_ITEM: CreateCSSProperties = {
  position: 'absolute',
  height: 5,
  width: TIMELINE_ITEM_WIDTH,
  opacity: 0.6,
};

const styles = () =>
  createStyles({
    dateItemFull: {
      ...DATE_ITEM_STYLES,
      borderLeft: '1px solid white',
      height: 36,
    },

    dateItem: merge(DATE_ITEM_STYLES, {
      '&:hover': {
        '& $dayItem': {
          borderLeft: 0,
        },
      },
    }),

    dateItemLabel: {
      position: 'absolute',
      top: 22,
      textAlign: 'left',
      paddingLeft: 5,
      minWidth: 400,
    },

    dayItem: {
      height: 10,
      borderLeft: '1px solid white',
    },

    intersectionDate: {
      ...BASE_DATE_ITEM,
      top: 0,
      backgroundColor: 'white',
    },
    layerOneDate: {
      ...BASE_DATE_ITEM,
      top: 5,
      backgroundColor: 'blue',
    },
    layerTwoDate: {
      ...BASE_DATE_ITEM,
      top: 10,
      backgroundColor: 'yellow',
    },
    layerThreeDate: {
      ...BASE_DATE_ITEM,
      top: 15,
      backgroundColor: 'red',
    },

    layerOneDirection: {
      top: 5,
      borderLeft: '8px solid darkblue',
    },
    layerTwoDirection: {
      top: 10,
      borderLeft: '8px solid yellow',
    },
    layerThreeDirection: {
      top: 15,
      borderLeft: '8px solid darkred',
    },
  });

export interface TimelineItemsProps extends WithStyles<typeof styles> {
  intersectionDates: number[];
  dateRange: DateRangeType[];
  clickDate: (arg: number) => void;
  locale: string;
  selectedLayers: DateCompatibleLayerWithDateItems[];
}

export default withStyles(styles)(TimelineItems);
