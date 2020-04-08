import React, { useState, useEffect, Fragment, forwardRef, Ref } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment';
import { flatten } from 'lodash';
import { Map } from 'immutable';
import {
  Divider,
  Grid,
  Button,
  createStyles,
  withStyles,
  WithStyles,
  Theme,
} from '@material-ui/core';
import DatePicker from 'react-datepicker';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAngleDoubleRight,
  faAngleDoubleLeft,
} from '@fortawesome/free-solid-svg-icons';
import 'react-datepicker/dist/react-datepicker.css';

import {
  dateRangeSelector,
  updateDateRange,
} from '../../../context/mapStateSlice';
import { months, getMonthStartAndEnd, isAvailableMonth } from './utils';
import { AvailableDates } from '../../../config/types';

interface InputProps {
  value?: string;
  onClick?: () => void;
}

const Input = forwardRef(
  ({ value, onClick }: InputProps, ref?: Ref<HTMLButtonElement>) => {
    return (
      <Button variant="outlined" onClick={onClick} ref={ref}>
        {value}
      </Button>
    );
  },
);

function DateSelector({ availableDates = Map(), classes }: DateSelectorProps) {
  const dispatch = useDispatch();
  const { startDate: stateStartDate } = useSelector(dateRangeSelector);
  const stateStartDateYear = moment(stateStartDate).year();

  const [selectedDate, setSelectedDate] = useState(moment(stateStartDate));
  const selectedMonth = selectedDate.month();
  const selectedYear = selectedDate.year();

  useEffect(() => {
    setSelectedDate(moment(stateStartDate));
  }, [stateStartDate]);

  function updateMonth(month: number) {
    const { startDate, endDate } = getMonthStartAndEnd(month, selectedYear);
    dispatch(updateDateRange({ startDate, endDate }));
  }

  function incrementYear() {
    setSelectedDate(selectedDate.clone().year(selectedYear + 1));
  }

  function decrementYear() {
    setSelectedDate(selectedDate.clone().year(selectedYear - 1));
  }

  function updateStartDate(date: Date) {
    const time = date.getTime();
    dispatch(updateDateRange({ startDate: time, endDate: time }));
  }

  return (
    <div className={classes.container}>
      <Grid
        container
        alignItems="center"
        className={classes.datePickerContainer}
      >
        <Grid item xs={2}>
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
            includeDates={flatten(availableDates.valueSeq().toJS())}
          />
        </Grid>

        <Grid item xs={10} className={classes.slider}>
          <Button onClick={decrementYear}>
            <FontAwesomeIcon icon={faAngleDoubleLeft} />
          </Button>

          <Grid container justify="center" spacing={1}>
            {months.map((month, index) => (
              <Fragment key={month}>
                {index !== 0 && (
                  <Divider
                    flexItem
                    className={classes.divider}
                    orientation="vertical"
                  />
                )}

                <Grid item>
                  <Button
                    variant={
                      index === selectedMonth &&
                      stateStartDateYear === selectedYear
                        ? 'contained'
                        : 'text'
                    }
                    onClick={() => updateMonth(index)}
                    disabled={
                      !isAvailableMonth(index, selectedYear, availableDates)
                    }
                    className={classes.monthButton}
                  >
                    {month}
                  </Button>
                </Grid>
              </Fragment>
            ))}
          </Grid>

          <Button onClick={incrementYear}>
            <FontAwesomeIcon icon={faAngleDoubleRight} />
          </Button>
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
      padding: theme.spacing(2),
      width: '90%',
      margin: 'auto',
      textAlign: 'center',
    },

    datePickerInput: {
      backgroundColor: theme.palette.primary.main,
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
  });

export interface DateSelectorProps extends WithStyles<typeof styles> {
  availableDates?: AvailableDates;
}

export default withStyles(styles)(DateSelector);
