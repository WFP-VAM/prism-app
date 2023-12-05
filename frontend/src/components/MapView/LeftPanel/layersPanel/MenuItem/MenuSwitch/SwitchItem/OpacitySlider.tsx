import {
  Box,
  Slider,
  Typography,
  WithStyles,
  createStyles,
  withStyles,
} from '@material-ui/core';
import { handleChangeOpacity } from 'components/MapView/Legends/handleChangeOpacity';
import { LayerType } from 'config/types';
import { mapSelector } from 'context/mapStateSlice/selectors';
import React, { ChangeEvent, memo, useCallback } from 'react';
import { useSelector } from 'react-redux';

const styles = createStyles({
  opacityText: {
    color: '#4CA1AD',
    marginBottom: '10px',
  },
  opacitySliderRoot: {
    color: '#4CA1AD',
    height: 8,
  },
  opacitySliderThumb: {
    backgroundColor: '#4CA1AD',
  },
});

interface OpacitySliderProps extends WithStyles<typeof styles> {
  opacity: number;
  activeLayer: string;
  layerId: string;
  layerType: LayerType['type'];
  setOpacityValue: React.Dispatch<React.SetStateAction<number>>;
}
const OpacitySlider = ({
  classes,
  opacity,
  activeLayer,
  layerId,
  layerType,
  setOpacityValue,
}: OpacitySliderProps) => {
  const map = useSelector(mapSelector);

  const handleOnChangeSliderValue = useCallback(
    (event: ChangeEvent<{}>, newValue: number | number[]) => {
      handleChangeOpacity(
        event,
        newValue as number,
        map,
        activeLayer || layerId,
        layerType,
        val => setOpacityValue(val),
      );
    },
    [activeLayer, layerId, layerType, map, setOpacityValue],
  );

  return (
    <Box display="flex" justifyContent="right" alignItems="center">
      <Box pr={3}>
        <Typography
          classes={{ root: classes.opacityText }}
        >{`Opacity ${Math.round(opacity * 100)}%`}</Typography>
      </Box>
      <Box width="25%" pr={3}>
        <Slider
          value={opacity}
          step={0.01}
          min={0}
          max={1}
          aria-labelledby="left-opacity-slider"
          classes={{
            root: classes.opacitySliderRoot,
            thumb: classes.opacitySliderThumb,
          }}
          onChange={handleOnChangeSliderValue}
        />
      </Box>
    </Box>
  );
};

export default memo(withStyles(styles)(OpacitySlider));
