import { Box, Slider, Typography } from '@mui/material';
import { LayerType } from 'config/types';
import { makeStyles, createStyles } from '@mui/styles';
import { useMapState } from 'utils/useMapState';
import { useOpacityState } from 'utils/useOpacityState';
import { memo, useCallback } from 'react';
import { useSelector } from 'react-redux';

const useStyles = makeStyles(() =>
  createStyles({
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
  }),
);

interface OpacitySliderProps {
  activeLayerId: string;
  layerId: string;
  layerType: LayerType['type'];
}
const OpacitySlider = memo(
  ({ activeLayerId, layerId, layerType }: OpacitySliderProps) => {
    const classes = useStyles();
    const opacityState = useOpacityState();
    const currentLayerId = activeLayerId || layerId;
    const opacity = useSelector(
      opacityState.getOpacitySelector(currentLayerId),
    );
    const mapState = useMapState();
    const map = mapState.maplibreMap();

    const handleOnChangeSliderValue = useCallback(
      (_event: Event, newValue: number | number[]) => {
        opacityState.setOpacity({
          map,
          value: newValue as number,
          layerId: currentLayerId,
          layerType,
        });
      },
      [currentLayerId, layerType, map, opacityState],
    );

    return (
      <Box
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        <Box
          style={{
            paddingRight: '3em',
          }}
        >
          <Typography
            classes={{ root: classes.opacityText }}
          >{`Opacity ${Math.round((opacity || 0) * 100)}%`}</Typography>
        </Box>
        <Box
          style={{
            width: '25%',
            paddingRight: 3,
          }}
        >
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
  },
);
export default OpacitySlider;
