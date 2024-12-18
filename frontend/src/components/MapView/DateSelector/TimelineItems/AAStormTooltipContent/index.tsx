import { ToggleButton, ToggleButtonGroup } from '@material-ui/lab';
import { DateRangeType } from 'config/types';
import { MouseEvent } from 'react';
import { formatInUTC } from 'components/MapView/Layers/AnticipatoryActionStormLayer/utils';
import { createStyles, makeStyles, Typography } from '@material-ui/core';
import { useWindStatesByTime } from '../hooks';

function AAStormTooltipContent({ date }: AAStormTooltipContentProps) {
  const windStates = useWindStatesByTime(date.value);
  const classes = useStyles();

  const hourToggleHandler = (
    _event: MouseEvent<HTMLElement>,
    _value: string | null,
  ) => {};

  return (
    <div className={classes.container}>
      <Typography> {formatInUTC(new Date(date.value), 'MM/dd/yy')}</Typography>
      <ToggleButtonGroup value="" exclusive onChange={hourToggleHandler}>
        {windStates.map(item => {
          const itemDate = new Date(item.ref_time);
          const formattedItemTime = formatInUTC(itemDate, 'K aaa');

          return (
            <ToggleButton key={itemDate.valueOf()} value={itemDate.valueOf()}>
              <Typography className={classes.time}>
                {formattedItemTime}
              </Typography>
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>
    </div>
  );
}

const useStyles = makeStyles(() =>
  createStyles({
    container: {
      display: 'flex',
      flexDirection: 'row',
      gap: '16px',
      alignItems: 'center',
    },
    time: {
      fontSize: '12px',
      fontWeight: 400,
      lineHeight: '15px',
      color: '#101010',
    },
  }),
);

interface AAStormTooltipContentProps {
  date: DateRangeType;
}
export default AAStormTooltipContent;
