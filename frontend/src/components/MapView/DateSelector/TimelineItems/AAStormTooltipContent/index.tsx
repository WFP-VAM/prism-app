import { ToggleButton, ToggleButtonGroup } from '@material-ui/lab';
import { DateRangeType } from 'config/types';
import { MouseEvent } from 'react';
import { formatInUTC } from 'components/MapView/Layers/AnticipatoryActionStormLayer/utils';
import { createStyles, makeStyles, Typography } from '@material-ui/core';
import {
  AADataSelector,
  loadStormReport,
  setSelectedStormName,
} from 'context/anticipatoryAction/AAStormStateSlice';
import { useDispatch, useSelector } from 'react-redux';
import { updateDateRange } from 'context/mapStateSlice';
import { getFormattedDate } from 'utils/date-utils';
import { useUrlHistory } from 'utils/url-utils';
import { useWindStatesByTime } from '../hooks';

function AAStormTooltipContent({ date }: AAStormTooltipContentProps) {
  const { updateHistory } = useUrlHistory();
  const stormData = useSelector(AADataSelector);
  const allWindStates = useWindStatesByTime(date.value);
  const classes = useStyles();
  const dispatch = useDispatch();

  const hourToggleHandler = (
    _event: MouseEvent<HTMLElement>,
    value: string,
    cycloneName: string,
  ) => {
    const [, dateValue] = value?.split('::') || ['', ''];
    const stormDate = new Date(dateValue);
    stormDate.setUTCHours(12);
    const time = stormDate.getTime();
    updateHistory('date', getFormattedDate(time, 'default') as string);
    dispatch(updateDateRange({ startDate: time }));
    dispatch(setSelectedStormName(cycloneName));
    dispatch(
      loadStormReport({
        date: dateValue,
        stormName: cycloneName || 'chido',
      }),
    );
  };

  const areMultipleCyclonesActive = allWindStates.length > 1;

  return (
    <div className={classes.container}>
      <div className={classes.dateAndCyclonesContainer}>
        <div className={classes.cyclonesContainer}>
          {allWindStates.map(windStates => (
            <div key={windStates.cycloneName} className={classes.cycloneRow}>
              {areMultipleCyclonesActive && (
                <Typography className={classes.cycloneName}>
                  {windStates.cycloneName?.toUpperCase()}
                </Typography>
              )}
              <ToggleButtonGroup
                value={`${stormData.forecastDetails?.cyclone_name.toUpperCase()}::${stormData.forecastDetails?.reference_time}`}
                exclusive
                onChange={(e, value) =>
                  hourToggleHandler(e, value, windStates.cycloneName || '')
                }
                style={{ marginRight: '8px' }}
              >
                {windStates?.states.map(item => {
                  const itemDate = new Date(item.ref_time);
                  const formattedItemTime = formatInUTC(itemDate, "haaa 'UTC'");

                  return (
                    <ToggleButton
                      key={`${windStates.cycloneName}::${itemDate.valueOf()}`}
                      value={`${windStates.cycloneName?.toUpperCase()}::${item.ref_time}`}
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
          ))}
        </div>
        <Typography className={classes.date}>
          {formatInUTC(new Date(date.value), 'MM/dd/yy')}
        </Typography>
      </div>
    </div>
  );
}

const useStyles = makeStyles(() =>
  createStyles({
    container: {
      display: 'flex',
      flexDirection: 'column',
    },
    dateAndCyclonesContainer: {
      display: 'flex',
      alignItems: 'center',
    },
    date: {
      minWidth: 'fit-content',
      gap: '8px',
    },
    cyclonesContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      width: '100%',
    },
    cycloneRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      justifyContent: 'flex-end',
      width: '100%',
    },
    cycloneName: {
      fontSize: '12px',
      fontWeight: 500,
      minWidth: 'fit-content',
    },
    time: {
      fontSize: '12px',
      fontWeight: 400,
      lineHeight: '15px',
      color: '#101010',
      whiteSpace: 'nowrap',
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
