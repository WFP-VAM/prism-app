import type { FC, ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { getDatePickerPortalTarget } from './datePickerUtils';

/** Escape overflow ancestors; stay inside MUI Dialog when one is open (aria-hidden). */
const DatePickerPopperPortal: FC<{ children?: ReactNode }> = ({ children }) => {
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(<>{children}</>, getDatePickerPortalTarget());
};

export default DatePickerPopperPortal;
