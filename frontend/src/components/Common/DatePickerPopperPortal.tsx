import type { FC, ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Renders calendar popper in document.body so overflow ancestors do not clip it. */
const DatePickerPopperPortal: FC<{ children?: ReactNode }> = ({ children }) =>
  typeof document !== 'undefined'
    ? createPortal(<>{children}</>, document.body)
    : null;

export default DatePickerPopperPortal;
