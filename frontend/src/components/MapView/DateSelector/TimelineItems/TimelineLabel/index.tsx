import { createStyles, Typography, makeStyles } from '@material-ui/core';
// @ts-ignore
import React from 'react';
import { DateRangeType } from 'config/types';
import { DateFormat } from 'utils/name-utils';
import { format } from 'date-fns';
import { locales } from 'i18n';

function TimelineLabel({ locale, date }: TimelineLabelProps) {
  const classes = useStyles();

  if (date.isFirstDay) {
    return (
      <Typography variant="body2" className={classes.dateItemLabel}>
        {format(date.value, DateFormat.MonthYear, {
          locale: locales[locale as keyof typeof locales],
        })}
      </Typography>
    );
  }
  return <div className={classes.dayItem} />;
}

const useStyles = makeStyles(() =>
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
      borderLeft: '1px solid #ededed',
    },
  }),
);

export interface TimelineLabelProps {
  locale: string;
  date: DateRangeType;
}

export default TimelineLabel;
