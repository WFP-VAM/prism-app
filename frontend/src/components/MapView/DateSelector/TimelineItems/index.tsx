import React from 'react';
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
  timelineDates,
  dateRange,
  selectedLayerTitles,
  clickDate,
}: TimelineItemsProps) {
  const click = (dateIndex: number) => {
    clickDate(dateIndex);
  };

  // Hard coded styling for date items (first , second and third layers)
  const dateItemClassNames: string[] = [
    classes.intersectionDate,
    classes.layerOneDate,
    classes.layerTwoDate,
    classes.layerThreeDate,
  ];

  const datesToDisplay = timelineDates.map(dates =>
    dates.map(date =>
      moment(date + USER_DATE_OFFSET).format(MONTH_FIRST_DATE_FORMAT),
    ),
  );

  return (
    <>
      {dateRange.map((date, index) => (
        <Tooltip
          title={
            <div style={{ whiteSpace: 'pre-line' }}>
              {selectedLayerTitles
                .filter((_, titleIndex) =>
                  datesToDisplay[titleIndex].includes(date.label),
                )
                .join('\n')}
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
            {timelineDates.map(
              (layerDates, layerIndex) =>
                layerDates
                  .map(layerDate =>
                    moment(layerDate + USER_DATE_OFFSET).format(
                      MONTH_FIRST_DATE_FORMAT,
                    ),
                  )
                  .includes(date.label) && (
                  <div
                    className={dateItemClassNames[layerIndex]}
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
      position: 'absolute',
      top: 0,
      backgroundColor: 'white',
      height: 5,
      width: TIMELINE_ITEM_WIDTH,
      opacity: 0.6,
    },
    layerOneDate: {
      position: 'absolute',
      top: 5,
      backgroundColor: 'blue',
      height: 5,
      width: TIMELINE_ITEM_WIDTH,
      opacity: 0.6,
    },
    layerTwoDate: {
      position: 'absolute',
      top: 10,
      backgroundColor: 'yellow',
      height: 5,
      width: TIMELINE_ITEM_WIDTH,
      opacity: 0.6,
    },
    layerThreeDate: {
      position: 'absolute',
      top: 15,
      backgroundColor: 'red',
      height: 5,
      width: TIMELINE_ITEM_WIDTH,
      opacity: 0.6,
    },
  });

export interface TimelineItemsProps extends WithStyles<typeof styles> {
  timelineDates: number[][];
  dateRange: DateRangeType[];
  selectedLayerTitles: string[];
  clickDate: (arg: number) => void;
}

export default withStyles(styles)(TimelineItems);
