import type { SxProps, Theme } from '@mui/material/styles';

export const searchFieldSx = {
  boxSizing: 'border-box',
  padding: '8px 16px',
  '&>div': {
    color: 'black',
  },
} satisfies SxProps<Theme>;

const menuItemSelectedSx = {
  '&&.Mui-selected': {
    backgroundColor: '#ADD8E6',
  },
} satisfies SxProps<Theme>;

export const menuItem0Sx = {
  textTransform: 'uppercase',
  letterSpacing: '3px',
  fontSize: '0.7em',
  ...menuItemSelectedSx,
} satisfies SxProps<Theme>;

export const menuItem1Sx = {
  paddingLeft: '2em',
  ...menuItemSelectedSx,
} satisfies SxProps<Theme>;

export const menuItem2Sx = {
  paddingLeft: '3em',
  fontSize: '0.9em',
  ...menuItemSelectedSx,
} satisfies SxProps<Theme>;

export const menuItem3Sx = {
  paddingLeft: '4em',
  fontSize: '0.9em',
  ...menuItemSelectedSx,
} satisfies SxProps<Theme>;

export const menuItemLevelSx: Record<number, SxProps<Theme>> = {
  0: menuItem0Sx,
  1: menuItem1Sx,
  2: menuItem2Sx,
  3: menuItem3Sx,
  4: menuItem3Sx,
};
