import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import {
  StylesProvider,
  ThemeProvider as StylesThemeProvider,
} from '@mui/styles';
import muiTheme from 'muiTheme';
import type { PropsWithChildren } from 'react';

/**
 * Wraps components that use @mui/styles makeStyles and/or @mui/material.
 * Requires both ThemeProviders so JSS hooks receive a full MUI theme
 * (palette, spacing(), shape, etc.).
 */
export default function TestMuiProviders({ children }: PropsWithChildren) {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={muiTheme}>
        <StylesThemeProvider theme={muiTheme}>
          <StylesProvider injectFirst>{children}</StylesProvider>
        </StylesThemeProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
