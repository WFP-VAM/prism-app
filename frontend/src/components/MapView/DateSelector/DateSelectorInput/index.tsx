import {
  Button,
  ButtonProps,
  createStyles,
  makeStyles,
  Theme,
} from '@material-ui/core';
import { forwardRef } from 'react';

export type DateSelectorInputProps = Omit<ButtonProps, 'children'> & {
  value?: string;
};

/**
 * MUI puts label text in `.MuiButton-label`. react-datepicker decides "outside click" via
 * `target.classList.contains('react-datepicker-ignore-onclickoutside')` on the event target;
 * clicks on the label would hit the span, not the root. `pointer-events: none` on the label
 * makes hits target the root button instead.
 */
const DateSelectorInput = forwardRef<HTMLButtonElement, DateSelectorInputProps>(
  ({ value, className, onMouseDown, ...rest }, ref) => {
    const classes = useStyles();
    const rootClassName = [classes.buttonStyle, className]
      .filter(Boolean)
      .join(' ');
    return (
      <Button
        {...rest}
        ref={ref}
        variant="outlined"
        classes={{
          root: rootClassName,
          label: classes.labelNoPointer,
        }}
        onMouseDown={e => {
          onMouseDown?.(e);
          // document-level mousedown listener in react-datepicker + map canvas bubbling
          e.stopPropagation();
        }}
      >
        {value}
      </Button>
    );
  },
);

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    buttonStyle: {
      // Use && to increase specificity — bypassing MUI dev environment issue
      '&&': {
        margin: 0,
        boxSizing: 'border-box',
        color: '#101010',
        fontWeight: 'bold',
        border: '1px solid rgba(0, 0, 0, 0.23)',
        borderRadius: theme.shape.borderRadius,
        padding: `${theme.spacing(1)}px ${theme.spacing(2)}px`,
        fontSize: theme.typography.button.fontSize,
        fontFamily: theme.typography.fontFamily,
        lineHeight: 1.75,
        textTransform: 'none',
        backgroundColor: theme.palette.common.white,
        cursor: 'pointer',
      },
      '&&:hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
      },
      '&&:disabled': {
        color: theme.palette.action.disabled,
        cursor: 'default',
      },
    },
    labelNoPointer: {
      pointerEvents: 'none',
    },
  }),
);

export default DateSelectorInput;
