import { forwardRef, Ref } from 'react';
import { Button, createStyles, makeStyles } from '@material-ui/core';

const DateSelectorInput = forwardRef(
  (
    { value, onClick }: DateSelectorInputProps,
    ref?: Ref<HTMLButtonElement>,
  ) => {
    const classes = useStyles();
    return (
      <Button
        className={classes.buttonStyle}
        variant="outlined"
        onClick={onClick}
        ref={ref}
      >
        {value}
      </Button>
    );
  },
);

const useStyles = makeStyles(() =>
  createStyles({
    buttonStyle: {
      color: '#101010',
      fontWeight: 'bold',
    },
  }),
);

interface DateSelectorInputProps {
  value?: string;
  onClick?: () => void;
}

export default DateSelectorInput;
