import type { SxProps, Theme } from '@mui/material/styles';

export const simpleDropdownSelectSx = {
  fontSize: '0.875rem',
  textTransform: 'none',
  letterSpacing: 'normal',
  color: '#666',
  '& .MuiSelect-select': {
    padding: '4px 32px 4px 8px',
    textTransform: 'none',
    letterSpacing: 'normal',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(0, 0, 0, 0.23)',
  },
} satisfies SxProps<Theme>;
