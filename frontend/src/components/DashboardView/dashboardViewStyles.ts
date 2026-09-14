import type { SxProps, Theme } from '@mui/material/styles';

export const dashboardContainerSx = {
  display: 'flex',
  flexDirection: 'column',
  height: 'calc(100vh - 56px)',
  position: 'relative',
} satisfies SxProps<Theme>;

export const dashboardPreviewModeContainerSx = {
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  background: '#F8F8F8',
  height: 'calc(100vh - 56px)',
  padding: '32px',
  boxSizing: 'border-box',
} satisfies SxProps<Theme>;

export const dashboardEditLayoutSx = {
  display: 'flex',
  gap: 16,
  flex: 1,
} satisfies SxProps<Theme>;

export const dashboardPreviewLayoutSx = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
} satisfies SxProps<Theme>;

export const dashboardToolbarSx = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  background: 'white',
  borderTop: '1px solid #E0E0E0',
  padding: '12px 16px',
  display: 'flex',
  justifyContent: 'center',
  gap: '8px',
  zIndex: 1400,
} satisfies SxProps<Theme>;

export const dashboardToolbarButtonSx = {
  textTransform: 'none',
} satisfies SxProps<Theme>;
