import React from 'react';
import { makeStyles, createStyles } from '@mui/styles';
import { Switch as SwitchUI, Typography } from '@mui/material';
import { cyanBlue } from 'muiTheme';

function Switch({ checked, onChange, title, ariaLabel }: PrintConfigProps) {
  const classes = useStyles();
  return (
    <>
      <SwitchUI
        checked={checked}
        onChange={onChange}
        className={classes.switch}
        color="primary"
        classes={{
          switchBase: classes.switchBase,
          track: classes.switchTrack,
        }}
        inputProps={{
          'aria-label': ariaLabel ?? title,
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
}

export default Switch;
