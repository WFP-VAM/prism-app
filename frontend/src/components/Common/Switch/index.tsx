import React from 'react';
import {
  Switch as SwitchUI,
  Typography,
  createStyles,
} from '@material-ui/core';
import { WithStyles, withStyles } from '@material-ui/styles';
import { cyanBlue } from 'muiTheme';

function Switch({
  checked,
  onChange,
  classes,
  title,
  ariaLabel,
}: PrintConfigProps) {
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

const styles = () =>
  createStyles({
    switch: {
      padding: '7px',
    },
    switchTrack: {
      backgroundColor: '#E0E0E0',
      borderRadius: '12px',
    },
    switchRipple: {
      backgroundColor: cyanBlue,
    },
    switchBase: {
      color: '#CECECE',
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
        opacity: 0.8,
      },
    },
  });

export interface PrintConfigProps extends WithStyles<typeof styles> {
  checked: boolean;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement>,
    checked: boolean,
  ) => void;
  title?: string;
  ariaLabel?: string;
}

export default withStyles(styles)(Switch);
