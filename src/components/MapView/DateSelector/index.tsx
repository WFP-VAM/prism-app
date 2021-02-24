import React, { forwardRef, Ref, useRef, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Moment from 'moment';
import { extendMoment } from 'moment-range';
import {
  Button,
  createStyles,
  Fade,
  Grid,
  Hidden,
  Tooltip,
  Theme,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import DatePicker from 'react-datepicker';
import Draggable from 'react-draggable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAngleDoubleLeft,
  faAngleDoubleRight,
} from '@fortawesome/free-solid-svg-icons';
import 'react-datepicker/dist/react-datepicker.css';
import { findIndex, get, isEqual } from 'lodash';
import { updateDateRange } from '../../../context/mapStateSlice';
import { findDateIndex } from './utils';
import { dateRangeSelector } from '../../../context/mapStateSlice/selectors';

interface InputProps {
  value?: string;
  onClick?: () => void;
}

const moment = extendMoment(Moment as any);

// The DatePicker is timezone aware, so we trick it into
// displaying UTC dates.
export const USER_DATE_OFFSET = new Date().getTimezoneOffset() * 60000;

const Input = forwardRef(
  ({ value, onClick }: InputProps, ref?: Ref<HTMLButtonElement>) => {
    return (
      <Button variant="outlined" onClick={onClick} ref={ref}>
        {value}
      </Button>
    );
  },
);

function DateSelector({ availableDates = [], classes }: DateSelectorProps) {
  const dispatch = useDispatch();
  const { startDate: stateStartDate } = useSelector(dateRangeSelector);

  const [selectedDate, setSelectedDate] = useState(moment(stateStartDate));
  const [dateRange, setDateRange] = useState([
    {
      value: 0,
      label: '',
      month: '',
      isFirstday: false,
    },
  ]);

  const [timelinePosition, setTimelinePosition] = useState({ x: 0, y: 0 });
  const [pointerPosition, setPointerPosition] = useState({ x: 0, y: 0 });

  const refDates = useRef(availableDates);

  const timeLine = useRef(null);
  const timeLineWidth = get(timeLine.current, 'offsetWidth', 0);

  // automatically move the slider so that the pointer always visible
  useEffect(() => {
    let x = 0;
    if (pointerPosition.x >= dateRange.length * 10 - timeLineWidth) {
      // eslint-disable-next-line fp/no-mutation
      x = timeLineWidth - dateRange.length * 10;
    } else if (pointerPosition.x > timeLineWidth) {
      // eslint-disable-next-line fp/no-mutation
      x = -1 * pointerPosition.x + timeLineWidth / 2;
    }
    if (
      -1 * timelinePosition.x > pointerPosition.x ||
      -1 * timelinePosition.x + timeLineWidth < pointerPosition.x
    ) {
      setTimelinePosition({ x, y: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointerPosition]);

  // create timeline range and set pointer position
  useEffect(() => {
    const range = Array.from(
      moment()
        .range(
          moment(stateStartDate).startOf('year'),
          moment(stateStartDate).endOf('year'),
        )
        .by('days'),
    ).map(e => {
      return {
        value: e.valueOf(),
        label: e.format('DD MMM YYYY'),
        month: e.format('MMM YYYY'),
        isFirstday: e.date() === e.startOf('month').date(),
      };
    });
    setDateRange(range);
    const dateIndex = findIndex(range, e => {
      return e.label === moment(stateStartDate).format('DD MMM YYYY');
    });
    setPointerPosition({
      x: dateIndex * 10,
      y: 0,
    });
    setSelectedDate(moment(stateStartDate));
  }, [stateStartDate]);

  function updateStartDate(date: Date) {
    const time = date.getTime();
    dispatch(updateDateRange({ startDate: time, endDate: time }));
  }

  function setDatePosition(date: number, increment: number) {
    const dates = availableDates.map(d => {
      return d + USER_DATE_OFFSET;
    });
    const selectedIndex = findDateIndex(dates, date as number);
    if (dates[selectedIndex + increment]) {
      updateStartDate(new Date(dates[selectedIndex + increment]));
    }
  }

  // move pointer to closest date when change map layer
  if (!isEqual(refDates.current, availableDates)) {
    setDatePosition(stateStartDate as number, 0);
    refDates.current = availableDates;
  }

  function incrementDate() {
    setDatePosition(stateStartDate as number, 1);
  }

  function decrementDate() {
    setDatePosition(stateStartDate as number, -1);
  }

  // click on timeline
  const clickDate = (index: number) => {
    const dates = availableDates.map(date => {
      return date + USER_DATE_OFFSET;
    });
    const selectedIndex = findDateIndex(dates, dateRange[index].value);
    if (selectedIndex >= 0 && dates[selectedIndex] !== stateStartDate) {
      setPointerPosition({ x: index * 10, y: 0 });
      updateStartDate(new Date(dates[selectedIndex]));
    }
  };

  // after dragging the timeline
  const onTimelineStop = (e: any, position: { x: number; y: number }) => {
    setTimelinePosition(position);
  };

  // after dragging the pointer
  const onPointerStop = (e: any, position: { x: number; y: number }) => {
    const exactX = Math.round(position.x / 10);
    if (exactX >= dateRange.length) {
      return;
    }
    const dates = availableDates.map(date => {
      return date + USER_DATE_OFFSET;
    });
    const selectedIndex = findDateIndex(dates, dateRange[exactX].value);
    if (selectedIndex >= 0 && dates[selectedIndex] !== stateStartDate) {
      setPointerPosition({ x: exactX * 10, y: position.y });
      updateStartDate(new Date(dates[selectedIndex]));
    }
  };

  return (
    <div className={classes.container}>
      <Grid
        container
        alignItems="center"
        justify="center"
        className={classes.datePickerContainer}
      >
        <Grid
          item
          xs={12}
          sm={1}
          className={classes.datePickerGrid}
          justify="center"
        >
          <Hidden smUp>
            <Button onClick={decrementDate}>
              <FontAwesomeIcon icon={faAngleDoubleLeft} />
            </Button>
          </Hidden>

          <DatePicker
            className={classes.datePickerInput}
            selected={selectedDate.toDate()}
            onChange={updateStartDate}
            maxDate={new Date()}
            todayButton="Today"
            peekNextMonth
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            customInput={<Input />}
            includeDates={availableDates.map(
              d => new Date(d + USER_DATE_OFFSET),
            )}
          />

          <Hidden smUp>
            <Button onClick={incrementDate}>
              <FontAwesomeIcon icon={faAngleDoubleRight} />
            </Button>
          </Hidden>
        </Grid>

        <Grid item xs={12} sm className={classes.slider}>
          <Hidden xsDown>
            <Button onClick={decrementDate}>
              <FontAwesomeIcon icon={faAngleDoubleLeft} />
            </Button>
          </Hidden>
          <Grid className={classes.dateContainer} ref={timeLine}>
            <Draggable
              axis="x"
              handle="#timeline"
              bounds={{
                top: 0,
                bottom: 0,
                right: 0,
                left: timeLineWidth - dateRange.length * 10,
              }}
              position={timelinePosition}
              onStop={onTimelineStop}
            >
              <div className={classes.timeline} id="timeline">
                <Grid
                  container
                  alignItems="stretch"
                  className={classes.dateLabelContainer}
                >
                  {dateRange.map((date, index) => (
                    <Tooltip
                      title={date.label}
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
                          date.isFirstday
                            ? classes.dateItemFull
                            : classes.dateItem
                        }
                      >
                        {date.isFirstday ? (
                          <Typography className={classes.dateItemLabel}>
                            {date.month}
                          </Typography>
                        ) : (
                          <div className={classes.dayItem} />
                        )}
                        {availableDates
                          .map(availableDate =>
                            moment(availableDate + USER_DATE_OFFSET).format(
                              'DD MMM YYYY',
                            ),
                          )
                          .includes(date.label) && (
                          <div
                            className={classes.dateAvailable}
                            role="presentation"
                            onClick={() => clickDate(index)}
                          />
                        )}
                      </Grid>
                    </Tooltip>
                  ))}
                </Grid>
                <Draggable
                  axis="x"
                  handle="#datePointerSelector"
                  bounds={{
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: dateRange.length * 10,
                  }}
                  grid={[10, 1]}
                  position={pointerPosition}
                  onStart={(e: any) => e.stopPropagation()}
                  onStop={onPointerStop}
                >
                  <div className={classes.triangle} id="datePointerSelector" />
                </Draggable>
              </div>
            </Draggable>
          </Grid>
          <Hidden xsDown>
            <Button onClick={incrementDate}>
              <FontAwesomeIcon icon={faAngleDoubleRight} />
            </Button>
          </Hidden>
        </Grid>
      </Grid>
    </div>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    container: {
      position: 'absolute',
      bottom: '8%',
      zIndex: theme.zIndex.modal,
      width: '100vw',
    },

    datePickerContainer: {
      backgroundColor: theme.palette.primary.main,
      borderRadius: theme.shape.borderRadius,
      padding: theme.spacing(1),
      width: '90%',
      margin: 'auto',
      textAlign: 'center',
    },

    datePickerInput: {
      backgroundColor: theme.palette.primary.main,
    },

    datePickerGrid: {
      display: 'flex',
      minWidth: '150px',
      [theme.breakpoints.down('xs')]: {
        marginBottom: '8px',
      },
    },

    slider: {
      display: 'flex',
    },

    monthButton: {
      fontSize: 12,
      minWidth: '4.2vw',
    },

    divider: {
      backgroundColor: theme.palette.grey[500],
    },

    dateContainer: {
      position: 'relative',
      height: '36px',
      flexGrow: 1,
      cursor: 'e-resize',
      overflow: 'hidden',
    },

    dateLabelContainer: {
      position: 'absolute',
      flexWrap: 'nowrap',
    },

    timeline: {
      position: 'relative',
      top: '5px',
    },

    dateItemFull: {
      borderLeft: '1px solid white',
      height: '36px',
      borderTop: '1px solid white',
      color: 'white',
      position: 'relative',
      top: '-5px',
      cursor: 'pointer',
      minWidth: '10px',
      '&:hover': {
        borderLeft: '1px solid #5ccfff',
      },
    },

    dateItem: {
      borderTop: '1px solid white',
      color: 'white',
      position: 'relative',
      top: '-5px',
      cursor: 'pointer',
      minWidth: '10px',
      '&:hover': {
        borderLeft: '1px solid #5ccfff',
        '& $dayItem': {
          borderLeft: '0',
        },
      },
    },

    dateItemLabel: {
      position: 'absolute',
      top: '18px',
      textAlign: 'left',
      paddingLeft: '5px',
      minWidth: '80px',
    },

    dayItem: {
      height: '10px',
      borderLeft: '1px solid white',
    },

    dateAvailable: {
      position: 'absolute',
      top: '0',
      backgroundColor: '#5ccfff',
      height: '5px',
      width: '10px',
      opacity: '0.5',
    },

    triangle: {
      width: 0,
      height: 0,
      cursor: 'pointer',
      borderLeft: '12px solid transparent',
      borderRight: '12px solid transparent',
      borderBottom: '15px solid #5ccfff',
      position: 'absolute',
      left: '-10px',
      top: '-5px',
    },
  });

export interface DateSelectorProps extends WithStyles<typeof styles> {
  availableDates?: number[];
}

export default withStyles(styles)(DateSelector);
