import { forwardRef, Ref } from 'react';
import {
  Button,
  createStyles,
  WithStyles,
  withStyles,
} from '@material-ui/core';

const DateSelectorInput = forwardRef(
  (
    { value, onClick, classes }: DateSelectorInputProps,
    ref?: Ref<HTMLButtonElement>,
  ) => (
    <Button
      className={classes.buttonStyle}
      variant="outlined"
      onClick={onClick}
      ref={ref}
    >
      {value}
    </Button>
  ),
);

const styles = () =>
  createStyles({
    buttonStyle: {
      color: '#101010',
      fontWeight: 'bold',
    },
  });

interface DateSelectorInputProps extends WithStyles<typeof styles> {
  value?: string;
  onClick?: () => void;
}

export default withStyles(styles)(DateSelectorInput);
