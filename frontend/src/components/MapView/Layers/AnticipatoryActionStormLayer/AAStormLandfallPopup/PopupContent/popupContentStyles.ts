import type { SxProps, Theme } from '@mui/material/styles';

export const blockSx = {
  display: 'block',
} satisfies SxProps<Theme>;

export const itemsContainerSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
} satisfies SxProps<Theme>;

export const itemContainerSx = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '8px',
  background: '#FFFFFF',
} satisfies SxProps<Theme>;

export const textSx = {
  fontSize: '14px',
  lineHeight: '18px',
  fontWeight: 400,
} satisfies SxProps<Theme>;

export const titleSx = {
  fontWeight: 700,
  padding: '2px 0px 2px 8px',
} satisfies SxProps<Theme>;

export const textAlignRightSx = {
  textAlign: 'right',
} satisfies SxProps<Theme>;
