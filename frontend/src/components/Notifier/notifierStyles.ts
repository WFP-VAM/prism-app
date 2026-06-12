import type { SxProps, Theme } from '@mui/material/styles';

export const notificationsContainerSx = {
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  zIndex: 9999,
  flexDirection: 'column',
  position: 'fixed',
  alignItems: 'center',
} satisfies SxProps<Theme>;

export const alertSx = {
  marginBottom: '10px',
} satisfies SxProps<Theme>;
