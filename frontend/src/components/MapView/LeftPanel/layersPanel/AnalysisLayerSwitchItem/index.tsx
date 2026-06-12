import OpacityIcon from '@mui/icons-material/Opacity';
import {
  Box,
  IconButton,
  Slider,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  analysisLayerSwitchItemSx,
  opacitySliderSx,
  switchItemOpacityButtonSx,
} from 'components/MapView/LeftPanel/layersPanel/layerPanelStyles';
import { clearAnalysisResult } from 'context/analysisResultStateSlice';
import { mapSelector } from 'context/mapStateSlice/selectors';
import {
  opacitySelector,
  setOpacity as setStateOpacity,
} from 'context/opacityStateSlice';
import { useSafeTranslation } from 'i18n';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  BaselineLayerResult,
  ExposedPopulationResult,
  PolygonAnalysisResult,
} from 'utils/analysis-utils';

import AnalysisLayerSwitchItemDownloadOptions from './AnalysisLayerSwitchItemDownloadOptions';

const AnalysisLayerSwitchItem = memo(
  ({
    title,
    initialOpacity,
    analysisData,
    analysisResultSortOrder,
    analysisResultSortByKey,
  }: AnalysisLayerSwitchItemProps) => {
    const dispatch = useDispatch();
    const map = useSelector(mapSelector);
    const [selected, setSelected] = useState<boolean>(true);
    const [isOpacitySelected, setIsOpacitySelected] = useState<boolean>(false);
    const opacity = useSelector(opacitySelector('analysis'));

    const { t } = useSafeTranslation();

    const setOpacity = useCallback(
      (value: number) =>
        dispatch(
          setStateOpacity({
            map,
            value,
            layerId: 'analysis',
            layerType: 'analysis',
          }),
        ),
      [dispatch, map],
    );

    useEffect(() => {
      if (opacity === undefined) {
        setOpacity(initialOpacity || 0);
      }
    }, [initialOpacity, opacity, setOpacity]);

    const handleOnChangeSwitch = useCallback(() => {
      setSelected(!selected);
      // The toggle button will be by default toggled
      dispatch(clearAnalysisResult());
    }, [dispatch, selected]);

    const handleOpacityClick = useCallback(() => {
      setIsOpacitySelected(!isOpacitySelected);
    }, [isOpacitySelected]);

    const renderedOpacitySlider = useMemo(() => {
      if (!selected || !isOpacitySelected) {
        return null;
      }
      return (
        <Box
          style={{
            display: 'flex',
            justifyContent: 'right',
            alignItems: 'center',
          }}
        >
          <Box
            style={{
              paddingRight: '3em',
            }}
          >
            <Typography
              sx={opacitySliderSx.text}
            >{`Opacity ${Math.round((opacity || 0) * 100)}%`}</Typography>
          </Box>
          <Box
            style={{
              width: '25%',
              paddingRight: '3em',
            }}
          >
            <Slider
              value={opacity}
              step={0.01}
              min={0}
              max={1}
              aria-labelledby="left-opacity-slider"
              sx={opacitySliderSx.root}
              onChange={(_event: Event, value: number | number[]) => {
                setOpacity(value as number);
              }}
            />
          </Box>
        </Box>
      );
    }, [isOpacitySelected, opacity, selected, setOpacity]);

    const renderedOpacityIconButton = useMemo(() => {
      if (!selected) {
        return (
          <IconButton
            disabled={!selected}
            sx={switchItemOpacityButtonSx(isOpacitySelected)}
            onClick={handleOpacityClick}
            size="large"
          >
            <OpacityIcon />
          </IconButton>
        );
      }
      return (
        <Tooltip title={t('Opacity') as string}>
          <span>
            <IconButton
              disabled={!selected}
              sx={switchItemOpacityButtonSx(isOpacitySelected)}
              onClick={handleOpacityClick}
              size="large"
            >
              <OpacityIcon />
            </IconButton>
          </span>
        </Tooltip>
      );
    }, [handleOpacityClick, isOpacitySelected, selected, t]);

    return (
      <Box
        sx={analysisLayerSwitchItemSx.root}
        style={{
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '100%',
        }}
      >
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex' }}>
            <Switch
              size="small"
              sx={analysisLayerSwitchItemSx.switch}
              checked={selected}
              onChange={handleOnChangeSwitch}
              slotProps={{
                input: {
                  'aria-label': title,
                },
              }}
            />
            <Typography sx={analysisLayerSwitchItemSx.title(selected)}>
              {title}
            </Typography>
          </div>
          <Box
            key="analysis-layer"
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {renderedOpacityIconButton}
            <AnalysisLayerSwitchItemDownloadOptions
              analysisData={analysisData}
              analysisResultSortByKey={analysisResultSortByKey}
              analysisResultSortOrder={analysisResultSortOrder}
              selected={selected}
            />
          </Box>
        </Box>
        {renderedOpacitySlider}
      </Box>
    );
  },
);

interface AnalysisLayerSwitchItemProps {
  title: string;
  initialOpacity: number;
  analysisData?:
    | BaselineLayerResult
    | PolygonAnalysisResult
    | ExposedPopulationResult;
  analysisResultSortByKey: string | number;
  analysisResultSortOrder: 'asc' | 'desc';
}

export default AnalysisLayerSwitchItem;
