import { createStyles, makeStyles, Theme } from '@material-ui/core';
import { ButtonHTMLAttributes, forwardRef } from 'react';

export type DateSelectorInputProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  value?: string;
};

/**
 * Native button for react-datepicker `customInput`. Avoids MUI Button ref
 * composition (setRef/composeRefs), which can loop under React 19 when the
 * picker re-clones the input during rapid layer/date updates.
 */
const DateSelectorInput = forwardRef<HTMLButtonElement, DateSelectorInputProps>(
  ({ value, className, onMouseDown, type = 'button', ...rest }, ref) => {
    const classes = useStyles();
    const rootClassName = [classes.buttonStyle, className]
      .filter(Boolean)
      .join(' ');
    return (
      <button
        {...rest}
        ref={ref}
        type={type}
        className={rootClassName}
        onMouseDown={e => {
          onMouseDown?.(e);
          // document-level mousedown listener in react-datepicker + map canvas bubbling
          e.stopPropagation();
        }}
      >
        {value}
      </button>
    );
  },
);

DateSelectorInput.displayName = 'DateSelectorInput';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    buttonStyle: {
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
      '&:hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
      },
      '&:disabled': {
        color: theme.palette.action.disabled,
        cursor: 'default',
      },
    },
  }),
);

export default DateSelectorInput;
