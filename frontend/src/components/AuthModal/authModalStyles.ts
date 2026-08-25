import type { SxProps, Theme } from '@mui/material/styles';

export const authModalSx = {
  width: '40vw',
  padding: '1em 0.75em',
} satisfies SxProps<Theme>;

export const authModalTitleSx = {
  marginBottom: '1.5em',
  padding: 0,
  color: 'text.secondary',
} satisfies SxProps<Theme>;

export const authModalLabelSx = {
  color: 'text.secondary',
} satisfies SxProps<Theme>;

export const authModalTextFieldSx = {
  width: '100%',
  '& .MuiInputBase-input': {
    color: 'text.secondary',
  },
} satisfies SxProps<Theme>;

export const authModalButtonWrapperSx = {
  marginTop: '2em',
  marginBottom: '1em',
  display: 'flex',
  width: '33%',
  justifyContent: 'space-between',
} satisfies SxProps<Theme>;
