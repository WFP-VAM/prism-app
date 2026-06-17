import OpacityIcon from '@mui/icons-material/Opacity';
import { Box, IconButton, Slider, Tooltip, Typography } from '@mui/material';
import Switch from 'components/Common/Switch';
import {
  layerDaySelectTitleSx,
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
import {
  ChangeEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
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

    const handleOnChangeSwitch = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        setSelected(event.target.checked);
        dispatch(clearAnalysisResult());
      },
      [dispatch],
    );

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

    return (
      <Box
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
          onMouseDown={e => e.stopPropagation()}
        >
          <Switch
            checked={selected}
            onChange={handleOnChangeSwitch}
            ariaLabel={title}
          />
          <Typography sx={layerDaySelectTitleSx(selected, false)}>
            {title}
          </Typography>
          <Tooltip title={t('Opacity') as string}>
            <span style={{ marginLeft: 'auto' }}>
              <IconButton
                disabled={!selected}
                sx={switchItemOpacityButtonSx(selected, isOpacitySelected)}
                onClick={handleOpacityClick}
                size="large"
              >
                <OpacityIcon />
              </IconButton>
            </span>
          </Tooltip>
          <AnalysisLayerSwitchItemDownloadOptions
            analysisData={analysisData}
            analysisResultSortByKey={analysisResultSortByKey}
            analysisResultSortOrder={analysisResultSortOrder}
            selected={selected}
          />
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
