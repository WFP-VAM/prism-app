import {
  Box,
  Slider,
  Typography,
  WithStyles,
  createStyles,
  withStyles,
} from '@material-ui/core';
import { LayerType } from 'config/types';
import { mapSelector } from 'context/mapStateSlice/selectors';
import { opacitySelector, setOpacity } from 'context/opacityStateSlice';
import { ChangeEvent, memo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

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
  activeLayerId: string;
  layerId: string;
  layerType: LayerType['type'];
}
function OpacitySlider({
  classes,
  activeLayerId,
  layerId,
  layerType,
}: OpacitySliderProps) {
  const dispatch = useDispatch();
  const opacity = useSelector(opacitySelector(activeLayerId || layerId));
  const map = useSelector(mapSelector);

  const handleOnChangeSliderValue = useCallback(
    (event: ChangeEvent<{}>, newValue: number | number[]) => {
      dispatch(
        setOpacity({
          map,
          value: newValue as number,
          layerId: activeLayerId || layerId,
          layerType,
        }),
      );
    },
    [activeLayerId, dispatch, layerId, layerType, map],
  );

  return (
    <Box display="flex" justifyContent="right" alignItems="center">
      <Box pr={3}>
        <Typography
          classes={{ root: classes.opacityText }}
        >{`Opacity ${Math.round((opacity || 0) * 100)}%`}</Typography>
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
}

export default memo(withStyles(styles)(OpacitySlider));
