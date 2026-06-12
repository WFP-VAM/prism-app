import { Switch as SwitchUI, Typography } from '@mui/material';
import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
import { cyanBlue } from 'muiTheme';
import React from 'react';

function Switch({
  checked,
  onChange,
  title,
  ariaLabel,
  disabled,
}: PrintConfigProps) {
  const classes = useStyles();
  return (
    <>
      <SwitchUI
        checked={checked}
        onChange={onChange}
        className={classes.switch}
        color="primary"
        disabled={disabled}
        classes={{
          switchBase: classes.switchBase,
          track: classes.switchTrack,
        }}
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

const useStyles = makeStyles(() =>
  createStyles({
    switch: {
      padding: '7px',
    },
    switchTrack: {
      backgroundColor: 'grey',
      borderRadius: '12px',
    },
    switchRipple: {
      backgroundColor: cyanBlue,
    },
    switchBase: {
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
  }),
);

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
