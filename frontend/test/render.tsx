import {
  render as rtlRender,
  type RenderOptions,
} from '@testing-library/react/pure';
import type { PropsWithChildren, ReactElement } from 'react';

import TestMuiProviders from './TestMuiProviders';

function render(ui: ReactElement, options?: RenderOptions) {
  const { wrapper: Wrapper, ...rest } = options ?? {};

  return rtlRender(ui, {
    ...rest,
    wrapper: ({ children }: PropsWithChildren) => {
      const content = Wrapper ? <Wrapper>{children}</Wrapper> : children;
      return <TestMuiProviders>{content}</TestMuiProviders>;
    },
  });
}

export * from '@testing-library/react/pure';
export { render };
