import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import muiTheme from 'muiTheme';
import type { PropsWithChildren } from 'react';

/** Test wrapper for MUI ThemeProvider + Emotion injectFirst. */
export default function TestMuiProviders({ children }: PropsWithChildren) {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>
    </StyledEngineProvider>
  );
}
