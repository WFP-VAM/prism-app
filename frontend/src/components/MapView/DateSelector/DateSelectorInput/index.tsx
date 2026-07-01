import { Button, ButtonProps } from '@mui/material';
import { forwardRef } from 'react';

export type DateSelectorInputProps = Omit<ButtonProps, 'children'> & {
  value?: string;
};

/**
 * react-datepicker decides "outside click" via
 * `target.classList.contains('react-datepicker-ignore-onclickoutside')` on the event target;
 * clicks on the label would hit the span, not the root. `pointer-events: none` on children
 * makes hits target the root button instead.
 */
const DateSelectorInput = forwardRef<HTMLButtonElement, DateSelectorInputProps>(
  ({ value, className, onMouseDown, ...rest }, ref) => (
    <Button
      {...rest}
      ref={ref}
      variant="outlined"
      className={className}
      sx={{
        '&&': {
          margin: 0,
          boxSizing: 'border-box',
          alignSelf: 'center',
          height: 'auto',
          minHeight: 'unset',
          whiteSpace: 'nowrap',
          color: '#101010',
          fontWeight: 'bold',
          border: '1px solid rgba(0, 0, 0, 0.23)',
          borderRadius: 1,
          px: 2,
          py: 1,
          fontSize: '0.875rem',
          lineHeight: 1.75,
          textTransform: 'none',
          backgroundColor: '#FFFFFF',
          cursor: 'pointer',
          pointerEvents: 'auto',
          '& > *': {
            pointerEvents: 'none',
          },
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
          '&.Mui-disabled': {
            color: 'action.disabled',
            cursor: 'default',
          },
        },
      }}
      onMouseDown={e => {
        onMouseDown?.(e);
        e.stopPropagation();
      }}
    >
      {value}
    </Button>
  ),
);

export default DateSelectorInput;
