import { ButtonHTMLAttributes, CSSProperties, forwardRef } from 'react';

export type DateSelectorInputProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  value?: string;
};

/**
 * Native button for react-datepicker `customInput`. Avoids MUI Button ref
 * composition (setRef/composeRefs), which can loop under React 19 when the
 * picker re-clones the input during rapid layer/date updates.
 *
 * react-datepicker decides "outside click" via
 * `target.classList.contains('react-datepicker-ignore-onclickoutside')` on the event target;
 * clicks on the label would hit the span, not the root. `pointer-events: none` on children
 * makes hits target the root button instead.
 */
const DateSelectorInput = forwardRef<HTMLButtonElement, DateSelectorInputProps>(
  ({ value, className, onMouseDown, type = 'button', style, ...rest }, ref) => (
    <button
      {...rest}
      ref={ref}
      type={type}
      className={className}
      style={{ ...buttonStyle, ...style }}
      onMouseDown={e => {
        onMouseDown?.(e);
        e.stopPropagation();
      }}
    >
      <span style={labelStyle}>{value}</span>
    </button>
  ),
);

DateSelectorInput.displayName = 'DateSelectorInput';

const buttonStyle: CSSProperties = {
  margin: 0,
  boxSizing: 'border-box',
  alignSelf: 'center',
  height: 'auto',
  minHeight: 'unset',
  whiteSpace: 'nowrap',
  color: '#101010',
  fontWeight: 'bold',
  border: '1px solid rgba(0, 0, 0, 0.23)',
  borderRadius: 4,
  padding: '8px 16px',
  fontSize: '0.875rem',
  lineHeight: 1.75,
  textTransform: 'none',
  backgroundColor: '#FFFFFF',
  cursor: 'pointer',
  pointerEvents: 'auto',
};

const labelStyle: CSSProperties = {
  pointerEvents: 'none',
};

export default DateSelectorInput;
