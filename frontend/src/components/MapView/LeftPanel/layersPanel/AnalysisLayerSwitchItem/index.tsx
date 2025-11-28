import {
  memo,
  useState,
  useCallback,
  useMemo,
  ChangeEvent,
  useEffect,
} from 'react';
import {Box,
  IconButton,
  Slider,
  Switch,
  Tooltip,
  Typography} from '@mui/material';

import { createStyles, makeStyles } from '@mui/styles';
import { useDispatch, useSelector } from 'react-redux';
import OpacityIcon from '@mui/icons-material/Opacity';
import { useSafeTranslation } from 'i18n';
import { clearAnalysisResult } from 'context/analysisResultStateSlice';
import {
  BaselineLayerResult,
  ExposedPopulationResult,
  PolygonAnalysisResult,
} from 'utils/analysis-utils';
import {
  opacitySelector,
  setOpacity as setStateOpacity,
} from 'context/opacityStateSlice';
import { mapSelector } from 'context/mapStateSlice/selectors';
import AnalysisLayerSwitchItemDownloadOptions from './AnalysisLayerSwitchItemDownloadOptions';

const AnalysisLayerSwitchItem = memo(
  ({
    title,
    initialOpacity,
    analysisData,
    analysisResultSortOrder,
    analysisResultSortByKey,
  }: AnalysisLayerSwitchItemProps) => {
    const classes = useStyles();
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
              classes={{ root: classes.opacityText }}
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
              classes={{
                root: classes.opacitySliderRoot,
                thumb: classes.opacitySliderThumb,
              }}
              onChange={(_event: ChangeEvent<{}>, value: number | number[]) => {
                setOpacity(value as number);
              }}
            />
          </Box>
        </Box>
      );
    }, [
      classes.opacitySliderRoot,
      classes.opacitySliderThumb,
      classes.opacityText,
      isOpacitySelected,
      opacity,
      selected,
      setOpacity,
    ]);

    const renderedOpacityIconButton = useMemo(() => {
      if (!selected) {
        return (
          <IconButton
            disabled={!selected}
            classes={{
              root: isOpacitySelected
                ? classes.opacityRootSelected
                : classes.opacityRoot,
            }}
            onClick={handleOpacityClick}
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
              classes={{
                root: isOpacitySelected
                  ? classes.opacityRootSelected
                  : classes.opacityRoot,
              }}
              onClick={handleOpacityClick}
            >
              <OpacityIcon />
            </IconButton>
          </span>
        </Tooltip>
      );
    }, [
      classes.opacityRoot,
      classes.opacityRootSelected,
      handleOpacityClick,
      isOpacitySelected,
      selected,
      t,
    ]);

    return (
      <Box
        className={classes.analysisLayerSwitchRootItem}
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
              className={classes.switch}
              classes={{
                switchBase: classes.switchBase,
                track: classes.switchTrack,
              }}
              checked={selected}
              onChange={handleOnChangeSwitch}
              inputProps={{
                'aria-label': title,
              }}
            />
            <Typography
              className={selected ? classes.title : classes.titleUnchecked}
            >
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

const useStyles = makeStyles(() =>
  createStyles({
    analysisLayerSwitchRootItem: {
      backgroundColor: '#FFFFFF',
    },
    title: {
      lineHeight: 1.8,
      color: 'black',
      fontWeight: 400,
    },
    titleUnchecked: {
      lineHeight: 1.8,
      fontWeight: 400,
    },
    select: {
      '&::before': {
        border: 'none',
      },
    },
    selectItem: {
      whiteSpace: 'normal',
      fontSize: 13,
      fontWeight: 300,
      color: 'black',
      padding: 0,
      marginLeft: 5,
    },
    selectItemUnchecked: {
      whiteSpace: 'normal',
      fontSize: 13,
      fontWeight: 300,
      padding: 0,
      marginLeft: 5,
    },
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
    opacityRoot: {
      marginLeft: 'auto',
    },
    opacityRootSelected: {
      backgroundColor: '#4CA1AD',
      color: '#F2F2F2',
      marginLeft: 'auto',
      '&:hover': {
        color: '#4CA1AD',
      },
    },
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
