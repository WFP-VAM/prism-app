import { Switch as SwitchUI, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { cyanBlue } from 'muiTheme';
import React from 'react';

const switchSx = {
  padding: '7px',
  '& .MuiSwitch-switchBase': {
    color: 'white',
    '&.Mui-checked': {
      color: 'white',
    },
    '& .MuiSwitch-thumb': {
      boxShadow:
        '0px 1px 1px -1px rgba(0,0,0,0.2),0px 0px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)',
    },
    '&.Mui-checked + MuiTouchRipple-root': {
      backgroundColor: cyanBlue,
    },
    '&.Mui-checked + .MuiSwitch-track': {
      backgroundColor: cyanBlue,
      opacity: 1,
    },
    '&.Mui-checked.Mui-disabled + .MuiSwitch-track': {
      opacity: 0.5,
    },
  },
  '& .MuiSwitch-track': {
    backgroundColor: 'grey',
    borderRadius: '12px',
  },
} satisfies SxProps<Theme>;

function Switch({
  checked,
  onChange,
  title,
  ariaLabel,
  disabled,
}: PrintConfigProps) {
  return (
    <>
      <SwitchUI
        checked={checked}
        onChange={onChange}
        sx={switchSx}
        color="primary"
        disabled={disabled}
        slotProps={{
          input: {
            'aria-label': ariaLabel ?? title,
          },
        }}
      />
      {!!title && (
        <Typography variant="h4" style={{ paddingLeft: '0.5rem' }}>
          {title}
        </Typography>
      )}
    </>
  );
}

export interface PrintConfigProps {
  checked: boolean;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement>,
    checked: boolean,
  ) => void;
  title?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export default Switch;
