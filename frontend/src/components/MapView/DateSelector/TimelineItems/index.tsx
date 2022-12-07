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
import moment from 'moment';
import { merge } from 'lodash';
import { DateRangeType } from '../../../../config/types';
import { TIMELINE_ITEM_WIDTH, USER_DATE_OFFSET } from '../utils';
import { MONTH_FIRST_DATE_FORMAT } from '../../../../utils/name-utils';

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

  const datesToDisplay = useMemo(
    () =>
      selectedLayerDates.map(layerDates =>
        layerDates.map(layerDate =>
          moment(layerDate + USER_DATE_OFFSET).format(MONTH_FIRST_DATE_FORMAT),
        ),
      ),
    [selectedLayerDates],
  );

  const getTooltipTitle = (date: DateRangeType) => {
    const tooltipTitleArray: string[] = selectedLayerTitles
      .filter((_, titleIndex) => {
        return datesToDisplay[titleIndex].includes(date.label);
      })
      .map(
        (selectedLayerTitle, titleIndex) =>
          `${selectedLayerTitle} (${DATE_ITEM_STYLING[titleIndex + 1].color})`,
      );
    tooltipTitleArray.unshift(date.label);
    return tooltipTitleArray.join('\n');
  };

  return (
    <>
      {dateRange.map((date, index) => (
        <Tooltip
          title={
            <div style={{ whiteSpace: 'pre-line' }}>
              {getTooltipTitle(date)}
            </div>
          }
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
            {[intersectionDates, ...selectedLayerDates].map(
              (layerDates, layerIndex) =>
                layerDates
                  .map(layerDate =>
                    moment(layerDate + USER_DATE_OFFSET).format(
                      MONTH_FIRST_DATE_FORMAT,
                    ),
                  )
                  .includes(date.label) && (
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
  });

export interface TimelineItemsProps extends WithStyles<typeof styles> {
  intersectionDates: number[];
  selectedLayerDates: number[][];
  dateRange: DateRangeType[];
  selectedLayerTitles: string[];
  clickDate: (arg: number) => void;
}

export default withStyles(styles)(TimelineItems);
