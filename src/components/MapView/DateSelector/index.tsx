import React, { Fragment, forwardRef, Ref } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Divider,
  Grid,
  Button,
  createStyles,
  withStyles,
  WithStyles,
  Theme,
} from '@material-ui/core';
import moment from 'moment';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAngleDoubleRight,
  faAngleDoubleLeft,
} from '@fortawesome/free-solid-svg-icons';

import { selectCurrentDate, updateDate } from '../../../context/mapStateSlice';
import { months, findAvailableDayInMonth } from './utils';

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

function DateSelector({ availableDates = [], classes }: DateSelectorProps) {
  const selectedDate = useSelector(selectCurrentDate);
  const selectedMonth = selectedDate.getMonth();
  const selectedYear = selectedDate.getFullYear();
  const dispatch = useDispatch();

  function isAvailableDate(date: Date) {
    return Boolean(
      availableDates.find(dateIt => moment(date).isSame(dateIt, 'day')),
    );
  }

  function isAvailableMonth(month: number) {
    return Boolean(
      findAvailableDayInMonth(new Date(selectedYear, month, 1), availableDates),
    );
  }

  function updateMonth(month: number) {
    // Fetching the first available day in the month
    const date = findAvailableDayInMonth(
      new Date(selectedYear, month, 1),
      availableDates,
    );
    if (date) {
      dispatch(updateDate(date));
    }
  }

  function incrementYear() {
    dispatch(updateDate(new Date(selectedYear + 1, selectedMonth, 1)));
  }

  function decrementYear() {
    dispatch(updateDate(new Date(selectedYear - 1, selectedMonth, 1)));
  }

  function updateStartDate(date: Date) {
    if (isAvailableDate(date)) {
      dispatch(updateDate(date));
    }
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
            selected={selectedDate}
            onChange={updateStartDate}
            maxDate={new Date()}
            todayButton="Today"
            peekNextMonth
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            customInput={<Input />}
            dayClassName={date =>
              isAvailableDate(date) ? null : classes.unavailableDate
            }
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
                    variant={index === selectedMonth ? 'contained' : 'text'}
                    onClick={() => updateMonth(index)}
                    disabled={!isAvailableMonth(index)}
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

    unavailableDate: {
      color: theme.palette.grey[500],
      cursor: 'default',

      '&:hover': {
        backgroundColor: 'inherit',
      },

      '&:focus': {
        outline: 'none',
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
  });

export interface DateSelectorProps extends WithStyles<typeof styles> {
  availableDates?: Date[];
}

export default withStyles(styles)(DateSelector);
