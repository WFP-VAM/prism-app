import { Box, Slider, Typography } from '@mui/material';
import { opacitySliderSx } from 'components/MapView/LeftPanel/layersPanel/layerPanelStyles';
import { LayerType } from 'config/types';
import { memo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useMapState } from 'utils/useMapState';
import { useOpacityState } from 'utils/useOpacityState';

interface OpacitySliderProps {
  activeLayerId: string;
  layerId: string;
  layerType: LayerType['type'];
}
const OpacitySlider = memo(
  ({ activeLayerId, layerId, layerType }: OpacitySliderProps) => {
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
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        <Box sx={{ pr: '3em' }}>
          <Typography
            sx={opacitySliderSx.text}
          >{`Opacity ${Math.round((opacity || 0) * 100)}%`}</Typography>
        </Box>
        <Box sx={{ width: '25%', pr: 3 }}>
          <Slider
            value={opacity}
            step={0.01}
            min={0}
            max={1}
            aria-labelledby="left-opacity-slider"
            sx={opacitySliderSx.root}
            onChange={handleOnChangeSliderValue}
          />
        </Box>
      </Box>
    );
  },
);
export default OpacitySlider;
