import React, {
  memo,
  useState,
  useCallback,
  useMemo,
  ChangeEvent,
  useEffect,
} from 'react';
import {
  Box,
  IconButton,
  Slider,
  Switch,
  Tooltip,
  Typography,
} from '@material-ui/core';
import { createStyles, WithStyles, withStyles } from '@material-ui/styles';
import { useDispatch, useSelector } from 'react-redux';
import OpacityIcon from '@material-ui/icons/Opacity';
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
    classes,
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
              onChange={(event: ChangeEvent<{}>, value: number | number[]) => {
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
        <Tooltip title="Opacity">
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
    ]);

    return (
      <Box
        className={classes.analysisLayerSwitchRootItem}
        display="flex"
        flexDirection="column"
        maxWidth="100%"
      >
        <Box
          display="flex"
          alignItems="center"
          m={2}
          justifyContent="space-between"
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
          <div>
            {renderedOpacityIconButton}
            <AnalysisLayerSwitchItemDownloadOptions
              analysisData={analysisData}
              analysisResultSortByKey={analysisResultSortByKey}
              analysisResultSortOrder={analysisResultSortOrder}
              selected={selected}
            />
          </div>
        </Box>
        {renderedOpacitySlider}
      </Box>
    );
  },
);

const styles = () =>
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
      color: '#828282',
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
      color: '#828282',
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
      color: '#828282',
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
  });

interface AnalysisLayerSwitchItemProps extends WithStyles<typeof styles> {
  title: string;
  initialOpacity: number;
  analysisData?:
    | BaselineLayerResult
    | PolygonAnalysisResult
    | ExposedPopulationResult;
  analysisResultSortByKey: string | number;
  analysisResultSortOrder: 'asc' | 'desc';
}

export default withStyles(styles)(AnalysisLayerSwitchItem);
