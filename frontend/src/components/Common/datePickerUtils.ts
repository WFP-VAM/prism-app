import type { Middleware } from '@floating-ui/react';

import { CALENDAR_POPPER_Z_INDEX } from './formComponentStyles';

/** MUI Modal sets aria-hidden on body children; portal inside open dialog when present. */
export function getDatePickerPortalTarget(): HTMLElement {
  const modals = document.querySelectorAll('.MuiModal-root.MuiDialog-root');
  for (let i = modals.length - 1; i >= 0; i -= 1) {
    const modal = modals[i];
    if (modal.getAttribute('aria-hidden') === 'true') {
      continue;
    }
    const container = modal.querySelector('.MuiDialog-container');
    if (container instanceof HTMLElement) {
      return container;
    }
  }

  return document.body;
}

export const datePickerZIndexModifier: Middleware = {
  name: 'prismDatePickerZIndex',
  fn({ elements }) {
    elements.floating.style.zIndex = String(CALENDAR_POPPER_Z_INDEX);
    return {};
  },
};
