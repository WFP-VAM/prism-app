import React, { useState, forwardRef, Ref } from 'react';
import {
  Button,
  createStyles,
  withStyles,
  WithStyles,
  Theme,
} from '@material-ui/core';
import moment from 'moment';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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

function DateSelector({ unavailableDates = [], classes }: DateSelectorProps) {
  const [startDate, setStartDate] = useState<Date | null>(new Date());

  function isUnavailableDate(date: Date) {
    return Boolean(
      unavailableDates.find(dateIt => moment(date).isSame(dateIt, 'day')),
    );
  }

  function updateStartDate(date: Date) {
    if (!isUnavailableDate(date)) {
      setStartDate(date);
    }
  }

  return (
    <div className={classes.container}>
      <div className={classes.datePickerContainer}>
        <DatePicker
          className={classes.datePickerInput}
          selected={startDate}
          onChange={updateStartDate}
          maxDate={new Date()}
          todayButton="Today"
          peekNextMonth
          showMonthDropdown
          showYearDropdown
          dropdownMode="select"
          customInput={<Input />}
          dayClassName={date =>
            isUnavailableDate(date) ? classes.unavailableDate : null
          }
        />
      </div>
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
      padding: theme.spacing(1, 2),
      width: '30%',
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
  });

export interface DateSelectorProps extends WithStyles<typeof styles> {
  unavailableDates?: Date[];
}

export default withStyles(styles)(DateSelector);
