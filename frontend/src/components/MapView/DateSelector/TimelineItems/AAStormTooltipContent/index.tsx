import { ToggleButton, ToggleButtonGroup } from '@material-ui/lab';
import { DateRangeType } from 'config/types';
import { MouseEvent } from 'react';
import { formatInUTC } from 'components/MapView/Layers/AnticipatoryActionStormLayer/utils';
import { createStyles, makeStyles, Typography } from '@material-ui/core';
import {
  AADataSelector,
  loadStormReport,
} from 'context/anticipatoryAction/AAStormStateSlice';
import { useDispatch, useSelector } from 'react-redux';
import { updateDateRange } from 'context/mapStateSlice';
import { getFormattedDate } from 'utils/date-utils';
import { useUrlHistory } from 'utils/url-utils';
import { useWindStatesByTime } from '../hooks';

function AAStormTooltipContent({ date }: AAStormTooltipContentProps) {
  const { updateHistory } = useUrlHistory();
  const stormData = useSelector(AADataSelector);
  const windStates = useWindStatesByTime(date.value);
  const classes = useStyles();
  const dispatch = useDispatch();

  const hourToggleHandler = (
    _event: MouseEvent<HTMLElement>,
    value: string,
  ) => {
    const stormDate = new Date(value);
    stormDate.setUTCHours(12);
    const time = stormDate.getTime();
    updateHistory('date', getFormattedDate(time, 'default') as string);
    dispatch(updateDateRange({ startDate: time }));
    dispatch(
      loadStormReport({
        date: value,
        stormName: windStates.cycloneName || 'chido',
      }),
    );
  };

  return (
    <div className={classes.container}>
      <Typography> {formatInUTC(new Date(date.value), 'MM/dd/yy')}</Typography>
      <ToggleButtonGroup
        value={stormData.forecastDetails?.reference_time}
        exclusive
        onChange={hourToggleHandler}
      >
        {windStates.states.map(item => {
          const itemDate = new Date(item.ref_time);
          const formattedItemTime = formatInUTC(itemDate, 'h aaa');

          return (
            <ToggleButton
              key={itemDate.valueOf()}
              value={item.ref_time}
              onMouseDown={e => e.preventDefault()}
              className={classes.toggleButton}
            >
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
    toggleButton: {
      padding: '6px 6px',
      minHeight: 0,
    },
  }),
);

interface AAStormTooltipContentProps {
  date: DateRangeType;
}

export default AAStormTooltipContent;
