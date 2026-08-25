import DatePickerPopperPortal from './DatePickerPopperPortal';
import { datePickerZIndexModifier } from './datePickerUtils';
import { CALENDAR_POPPER_CLASS } from './formComponentStyles';

export const datePickerPopperProps = {
  popperClassName: CALENDAR_POPPER_CLASS,
  popperContainer: DatePickerPopperPortal,
  popperModifiers: [datePickerZIndexModifier],
};
