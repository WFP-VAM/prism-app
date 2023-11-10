import {
  WithStyles,
  createStyles,
  withStyles,
  Typography,
} from '@material-ui/core';
import React from 'react';
import { DateRangeType } from 'config/types';
import { moment } from 'i18n';
import { MONTH_YEAR_DATE_FORMAT } from 'utils/name-utils';

const TimelineLabel = ({ classes, locale, date }: TimelineLabelProps) => {
  if (date.isFirstDay) {
    return (
      <Typography variant="body2" className={classes.dateItemLabel}>
        {moment(date.value).locale(locale).format(MONTH_YEAR_DATE_FORMAT)}
      </Typography>
    );
  }
  return <div className={classes.dayItem} />;
};

const styles = () =>
  createStyles({
    dateItemLabel: {
      color: '#101010',
      position: 'absolute',
      top: 33,
      textAlign: 'left',
      paddingLeft: 2,
      minWidth: 400,
      fontWeight: 'bold',
      zIndex: 1,
    },

    dayItem: {
      height: 10,
      background: '#ededed',
    },
  });

export interface TimelineLabelProps extends WithStyles<typeof styles> {
  locale: string;
  date: DateRangeType;
}

export default withStyles(styles)(TimelineLabel);
