import { createStyles, Typography, makeStyles } from '@material-ui/core';
import { DateRangeType } from 'config/types';
import { DateFormat } from 'utils/name-utils';
import { format } from 'date-fns';
import { locales } from 'i18n';

function TimelineLabel({
  locale,
  date,
  showDraggingCursor,
}: TimelineLabelProps) {
  const classes = useStyles();

  if (date.isFirstDay) {
    return (
      <Typography
        variant="body2"
        className={classes.dateItemLabel}
        style={{ cursor: showDraggingCursor ? 'ew-resize' : 'default' }}
        // prevent click on the label from triggering the date selection
        onClick={e => e.stopPropagation()}
      >
        {format(
          date.value,
          date.month.includes('Jan')
            ? DateFormat.ShortMonthYear
            : DateFormat.ShortMonth,
          {
            locale: locales[locale as keyof typeof locales],
          },
        )}
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
      position: 'absolute',
      height: 10,
      marginLeft: '-1px',
      borderLeft: '1px solid #ededed',
      zIndex: -1,
    },
  }),
);

export interface TimelineLabelProps {
  locale: string;
  date: DateRangeType;
  showDraggingCursor: boolean;
}

export default TimelineLabel;
