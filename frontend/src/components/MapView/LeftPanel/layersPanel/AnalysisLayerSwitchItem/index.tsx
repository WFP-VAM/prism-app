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
import { handleChangeOpacity } from 'components/MapView/Legends/handleChangeOpacity';
import { mapSelector } from 'context/mapStateSlice/selectors';
import {
  BaselineLayerResult,
  ExposedPopulationResult,
  PolygonAnalysisResult,
} from 'utils/analysis-utils';
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
    const [opacity, setOpacityValue] = useState<number>(initialOpacity || 0);

    useEffect(() => {
      setOpacityValue(initialOpacity || 0);
    }, [initialOpacity]);

    const handleOnChangeSwitch = useCallback(() => {
      setSelected(!selected);
      // The toggle button will be by default toggled
      dispatch(clearAnalysisResult());
    }, [dispatch, selected]);

    const handleOpacityClick = useCallback(() => {
      setIsOpacitySelected(!isOpacitySelected);
    }, [isOpacitySelected]);

    const handleChangeOpacityValue = useCallback(val => {
      setOpacityValue(val);
    }, []);

    const handleOnChangeSliderValue = useCallback(
      (event: ChangeEvent<{}>, newValue: number | number[]) => {
        handleChangeOpacity(
          event,
          newValue as number,
          map,
          'analysis', // We have to pass undefined here so that the function know that we are in an analysis custom layer
          undefined, // We have also to pass undefined here to show that we have analysis custom layer,
          handleChangeOpacityValue,
        );
      },
      [handleChangeOpacityValue, map],
    );

    const renderedOpacitySlider = useMemo(() => {
      if (!selected || !isOpacitySelected) {
        return null;
      }
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
    }, [
      classes.opacitySliderRoot,
      classes.opacitySliderThumb,
      classes.opacityText,
      handleOnChangeSliderValue,
      isOpacitySelected,
      opacity,
      selected,
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
        <Box display="flex" alignItems="center" m={2}>
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
          {renderedOpacityIconButton}
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
