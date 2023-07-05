import {
  Box,
  createStyles,
  IconButton,
  MenuItem,
  Select,
  Slider,
  Switch,
  Tooltip,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import OpacityIcon from '@material-ui/icons/Opacity';
import React, {
  ChangeEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { LayerKey, LayerType } from '../../../../../../config/types';
import {
  getDisplayBoundaryLayers,
  LayerDefinitions,
} from '../../../../../../config/utils';
import { clearDataset } from '../../../../../../context/datasetStateSlice';
import { removeLayer } from '../../../../../../context/mapStateSlice';
import {
  layersSelector,
  mapSelector,
} from '../../../../../../context/mapStateSlice/selectors';
import { useSafeTranslation } from '../../../../../../i18n';
import {
  refreshBoundaries,
  safeDispatchAddLayer,
  safeDispatchRemoveLayer,
} from '../../../../../../utils/map-utils';
import { getUrlKey, useUrlHistory } from '../../../../../../utils/url-utils';
import { handleChangeOpacity } from '../../../../Legends/handleChangeOpacity';
import { Extent } from '../../../../Layers/raster-utils';
import LayerDownloadOptions from './LayerDownloadOptions';
import ExposureAnalysisOption from './ExposureAnalysisOption';
import { availableDatesSelector } from '../../../../../../context/serverStateSlice';
import { checkLayerAvailableDatesAndContinueOrRemove } from '../../../../utils';
import { LocalError } from '../../../../../../utils/error-utils';

const SwitchItem = memo(({ classes, layer, extent }: SwitchItemProps) => {
  const {
    id: layerId,
    title: layerTitle,
    opacity: initialOpacity,
    type: layerType,
    group,
  } = layer;
  const { t } = useSafeTranslation();
  const selectedLayers = useSelector(layersSelector);
  const serverAvailableDates = useSelector(availableDatesSelector);
  const map = useSelector(mapSelector);
  const [isOpacitySelected, setIsOpacitySelected] = useState(false);
  const [opacity, setOpacityValue] = useState<number>(initialOpacity || 0);
  const dispatch = useDispatch();
  const {
    updateHistory,
    appendLayerToUrl,
    removeLayerFromUrl,
  } = useUrlHistory();

  useEffect(() => {
    setIsOpacitySelected(false);
    setOpacityValue(initialOpacity || 0);
  }, [initialOpacity]);

  const selected = useMemo(() => {
    return selectedLayers.some(({ id: testId }) => {
      return (
        testId === layerId || (group && group.layers.some(l => l.id === testId))
      );
    });
  }, [group, layerId, selectedLayers]);

  const selectedActiveLayer = useMemo(() => {
    return selected
      ? selectedLayers.filter(sl => {
          return (
            (group?.activateAll &&
              group?.layers.find(l => l.id === sl.id && l.main)) ||
            (!group?.activateAll &&
              group?.layers.map(l => l.id).includes(sl.id))
          );
        })
      : [];
  }, [group, selected, selectedLayers]);

  const initialActiveLayer = useMemo(() => {
    return selectedActiveLayer.length > 0 ? selectedActiveLayer[0].id : null;
  }, [selectedActiveLayer]);

  const [activeLayer, setActiveLayer] = useState(
    initialActiveLayer || (group?.layers?.find(l => l.main)?.id as string),
  );

  useEffect(() => {
    setActiveLayer(
      initialActiveLayer || (group?.layers?.find(l => l.main)?.id as string),
    );
  }, [group, initialActiveLayer]);

  const exposure = useMemo(() => {
    return (layer.type === 'wms' && layer.exposure) || undefined;
  }, [layer.exposure, layer.type]);

  const validatedTitle = useMemo(() => {
    return t(group?.groupTitle || layerTitle || '');
  }, [group, layerTitle, t]);

  const toggleLayerValue = useCallback(
    (selectedLayerId: string, checked: boolean) => {
      // reset opacity value
      setOpacityValue(initialOpacity || 0);
      // reset opacity selected
      setIsOpacitySelected(false);
      // clear previous table dataset loaded first
      // to close the dataseries and thus close chart
      dispatch(clearDataset());

      const selectedLayer = group
        ? LayerDefinitions[selectedLayerId as LayerKey]
        : layer;

      const urlLayerKey = getUrlKey(selectedLayer);

      if (!checked) {
        removeLayerFromUrl(urlLayerKey, selectedLayer.id);
        dispatch(removeLayer(selectedLayer));

        // For admin boundary layers with boundary property
        // we have to de-activate the unique boundary and re-activate
        // default boundaries
        if (!('boundary' in selectedLayer)) {
          return;
        }
        const boundaryId = selectedLayer.boundary || '';

        if (!Object.keys(LayerDefinitions).includes(boundaryId)) {
          return;
        }
        const displayBoundaryLayers = getDisplayBoundaryLayers();
        const uniqueBoundaryLayer = LayerDefinitions[boundaryId as LayerKey];

        if (
          !displayBoundaryLayers.map(l => l.id).includes(uniqueBoundaryLayer.id)
        ) {
          safeDispatchRemoveLayer(map, uniqueBoundaryLayer, dispatch);
        }

        displayBoundaryLayers.forEach(l => {
          safeDispatchAddLayer(map, l, dispatch);
        });
        return;
      }
      try {
        checkLayerAvailableDatesAndContinueOrRemove(
          layer,
          serverAvailableDates,
          removeLayerFromUrl,
          dispatch,
        );
      } catch (error) {
        console.error((error as LocalError).getErrorMessage());
        return;
      }
      const updatedUrl = appendLayerToUrl(
        urlLayerKey,
        selectedLayers,
        selectedLayer,
      );
      updateHistory(urlLayerKey, updatedUrl);
      if (
        'boundary' in selectedLayer ||
        selectedLayer.type !== 'admin_level_data'
      ) {
        return;
      }
      refreshBoundaries(map, dispatch);
    },
    [
      appendLayerToUrl,
      dispatch,
      group,
      initialOpacity,
      layer,
      map,
      removeLayerFromUrl,
      selectedLayers,
      serverAvailableDates,
      updateHistory,
    ],
  );

  const handleSelect = useCallback(
    (event: React.ChangeEvent<{ value: string | unknown }>) => {
      const selectedId = event.target.value;
      setActiveLayer(selectedId as string);
      toggleLayerValue(selectedId as string, true);
    },
    [toggleLayerValue],
  );

  const renderedGroupLayersMenuItems = useMemo(() => {
    return group?.layers.map(menu => {
      return (
        <MenuItem key={menu.id} value={menu.id}>
          {t(menu.label)}
        </MenuItem>
      );
    });
  }, [group, t]);

  const renderedSelectGroupActivateAll = useMemo(() => {
    if (group?.activateAll) {
      return null;
    }
    return (
      <Select
        className={classes.select}
        classes={{
          root: selected ? classes.selectItem : classes.selectItemUnchecked,
        }}
        value={activeLayer}
        onChange={e => handleSelect(e)}
      >
        {renderedGroupLayersMenuItems}
      </Select>
    );
  }, [
    activeLayer,
    classes.select,
    classes.selectItem,
    classes.selectItemUnchecked,
    group,
    handleSelect,
    renderedGroupLayersMenuItems,
    selected,
  ]);

  const menuTitle = useMemo(() => {
    if (group) {
      return (
        <>
          <Typography
            className={selected ? classes.title : classes.titleUnchecked}
          >
            {validatedTitle}
          </Typography>
          {renderedSelectGroupActivateAll}
        </>
      );
    }
    return (
      <Typography className={selected ? classes.title : classes.titleUnchecked}>
        {validatedTitle}
      </Typography>
    );
  }, [
    classes.title,
    classes.titleUnchecked,
    group,
    renderedSelectGroupActivateAll,
    selected,
    validatedTitle,
  ]);

  const renderedExposureAnalysisOption = useMemo(() => {
    if (!exposure) {
      return null;
    }
    return (
      <ExposureAnalysisOption
        layer={layer}
        extent={extent}
        selected={selected}
        exposure={exposure}
      />
    );
  }, [exposure, extent, layer, selected]);

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
    [activeLayer, layerId, layerType, map],
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

  const handleOnChangeSwitch = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      toggleLayerValue(activeLayer, event.target.checked);
    },
    [activeLayer, toggleLayerValue],
  );

  return (
    <Box display="flex" flexDirection="column" maxWidth="100%">
      <Box key={layerId} display="flex" alignItems="center" m={2}>
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
            'aria-label': validatedTitle,
          }}
        />
        {menuTitle}
        <Tooltip title="Opacity">
          <IconButton
            disabled={!selected}
            classes={{
              root: isOpacitySelected
                ? classes.opacityRootSelected
                : classes.opacityRoot,
            }}
            onClick={() =>
              setIsOpacitySelected(opacitySelected => !opacitySelected)
            }
          >
            <OpacityIcon />
          </IconButton>
        </Tooltip>
        {renderedExposureAnalysisOption}
        <LayerDownloadOptions
          layer={layer}
          extent={extent}
          selected={selected}
        />
      </Box>
      {renderedOpacitySlider}
    </Box>
  );
});

const styles = () =>
  createStyles({
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

export interface SwitchItemProps extends WithStyles<typeof styles> {
  layer: LayerType;
  extent?: Extent;
}

export default withStyles(styles)(SwitchItem);
