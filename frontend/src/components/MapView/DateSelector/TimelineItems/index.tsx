import React, { useMemo } from 'react';
import {
  createStyles,
  Fade,
  Grid,
  Tooltip,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { CreateCSSProperties } from '@material-ui/styles';
import { merge, compact } from 'lodash';
import { DateRangeType } from '../../../../config/types';
import { TIMELINE_ITEM_WIDTH, formatDate } from '../utils';

function TimelineItems({
  classes,
  intersectionDates,
  dateRange,
  selectedLayerDates,
  selectedLayerTitles,
  clickDate,
}: TimelineItemsProps) {
  const click = (dateIndex: number) => {
    clickDate(dateIndex);
  };

  // Hard coded styling for date items (first, second, and third layers)
  const DATE_ITEM_STYLING: { class: string; color: string }[] = [
    { class: classes.intersectionDate, color: 'White' },
    { class: classes.layerOneDate, color: 'Blue' },
    { class: classes.layerTwoDate, color: 'Yellow' },
    { class: classes.layerThreeDate, color: 'Red' },
  ];

  const formattedSelectedLayerDates = useMemo(
    () =>
      selectedLayerDates.map(layerDates =>
        layerDates.map(layerDate => formatDate(layerDate)),
      ),
    [selectedLayerDates],
  );

  const formattedIntersectionDates = useMemo(
    () => intersectionDates.map(layerDate => formatDate(layerDate)),
    [intersectionDates],
  );

  const TooltipItem = ({
    layerTitle,
    color,
  }: {
    layerTitle: string;
    color: string;
  }) => {
    return (
      <div className={classes.tooltipItemContainer}>
        <div>{layerTitle}</div>
        <div
          className={classes.tooltipItemColor}
          style={{
            backgroundColor: color,
          }}
        />
      </div>
    );
  };

  const getTooltipTitle = (date: DateRangeType): JSX.Element[] => {
    const tooltipTitleArray: JSX.Element[] = compact(
      selectedLayerTitles.map((selectedLayerTitle, layerIndex) => {
        if (
          formattedSelectedLayerDates[layerIndex].includes(
            formatDate(date.value),
          )
        ) {
          return (
            <TooltipItem
              layerTitle={selectedLayerTitle}
              color={DATE_ITEM_STYLING[layerIndex + 1].color}
            />
          );
        }
        return undefined;
      }),
    );
    // eslint-disable-next-line fp/no-mutating-methods
    tooltipTitleArray.unshift(<div>{date.label}</div>);

    return tooltipTitleArray;
  };

  return (
    <>
      {dateRange.map((date, index) => (
        <Tooltip
          title={<div>{getTooltipTitle(date)}</div>}
          key={date.label}
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
            {date.isFirstDay ? (
              <Typography variant="body2" className={classes.dateItemLabel}>
                {date.month}
              </Typography>
            ) : (
              <div className={classes.dayItem} />
            )}
            {[formattedIntersectionDates, ...formattedSelectedLayerDates].map(
              (layerDates, layerIndex) =>
                layerDates.includes(formatDate(date.value)) && (
                  <div
                    className={DATE_ITEM_STYLING[layerIndex].class}
                    role="presentation"
                    onClick={() => click(index)}
                  />
                ),
            )}
          </Grid>
        </Tooltip>
      ))}
    </>
  );
}

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
      minWidth: 80,
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
    tooltipItemContainer: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
    },
    tooltipItemColor: {
      display: 'flex',
      width: 5,
      height: 5,
      marginLeft: 3,
    },
  });

export interface TimelineItemsProps extends WithStyles<typeof styles> {
  intersectionDates: number[];
  selectedLayerDates: number[][];
  dateRange: DateRangeType[];
  selectedLayerTitles: string[];
  clickDate: (arg: number) => void;
}

export default withStyles(styles)(TimelineItems);
