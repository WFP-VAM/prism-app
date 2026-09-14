import type { SxProps, Theme } from '@mui/material/styles';
import { colors } from 'muiTheme';

export const loginContainerSx = {
  width: '100vw',
  height: '100vh',
  backgroundColor: colors.greyBlue,
  display: 'flex',
  justifyContent: 'center',
} satisfies SxProps<Theme>;

export const loginContentSx = {
  margin: 'auto',
  maxWidth: '50vw',
} satisfies SxProps<Theme>;

export const loginImageSx = {
  width: '90%',
  opacity: 0.5,
} satisfies SxProps<Theme>;
