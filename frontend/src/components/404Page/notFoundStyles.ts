import type { SxProps, Theme } from '@mui/material/styles';
import { colors } from 'muiTheme';

export const notFoundContainerSx = {
  width: '100vw',
  height: '100vh',
  backgroundColor: colors.skyBlue,
  display: 'flex',
  justifyContent: 'center',
} satisfies SxProps<Theme>;

export const notFoundContentSx = {
  margin: 'auto',
  maxWidth: '50vw',
} satisfies SxProps<Theme>;

export const notFoundImageSx = {
  width: '90%',
  opacity: 0.5,
} satisfies SxProps<Theme>;
