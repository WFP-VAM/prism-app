import {
  Switch,
  WithStyles,
  createStyles,
  withStyles,
} from '@material-ui/core';
import React, { ChangeEvent, memo, useCallback } from 'react';

const styles = () =>
  createStyles({
    switch: {
      marginRight: 2,
    },
    switchTrack: {
      backgroundColor: '#E0E0E0',
    },
    switchBase: {
      color: '#E0E0E0',
      '&.Mui-checked': {
        color: '#53888F',
      },
      '&.Mui-checked + .MuiSwitch-track': {
        backgroundColor: '#B1D6DB',
      },
    },
  });

interface SwitchActionProps extends WithStyles<typeof styles> {
  someLayerAreSelected: boolean;
  toggleLayerValue: (selectedLayerId: string, checked: boolean) => void;
  activeLayerId: string;
  validatedTitle: string;
}
const SwitchAction = ({
  classes,
  someLayerAreSelected,
  toggleLayerValue,
  activeLayerId,
  validatedTitle,
}: SwitchActionProps) => {
  const handleOnChangeSwitch = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      toggleLayerValue(activeLayerId, event.target.checked);
    },
    [activeLayerId, toggleLayerValue],
  );
  return (
    <Switch
      size="small"
      className={classes.switch}
      classes={{
        switchBase: classes.switchBase,
        track: classes.switchTrack,
      }}
      checked={someLayerAreSelected}
      onChange={handleOnChangeSwitch}
      inputProps={{
        'aria-label': validatedTitle,
      }}
    />
  );
};

export default memo(withStyles(styles)(SwitchAction));
