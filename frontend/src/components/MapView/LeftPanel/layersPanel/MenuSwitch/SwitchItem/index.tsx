import {
  Box,
  createStyles,
  IconButton,
  MenuItem,
  Select,
  Switch,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import OpacityIcon from '@material-ui/icons/Opacity';
import React, { useState } from 'react';
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

function SwitchItem({ classes, layer }: SwitchItemProps) {
  const { t } = useSafeTranslation();
  const selectedLayers = useSelector(layersSelector);
  const map = useSelector(mapSelector);
  const [isOpacitySelected, setIsOpacitySelected] = useState(false);
  const dispatch = useDispatch();
  const {
    updateHistory,
    appendLayerToUrl,
    removeLayerFromUrl,
  } = useUrlHistory();

  const { id: layerId, title: layerTitle, group } = layer;

  const selected = selectedLayers.some(({ id: testId }) => {
    return (
      testId === layerId || (group && group.layers.some(l => l.id === testId))
    );
  });

  const selectedActiveLayer = selected
    ? selectedLayers.filter(sl => {
        return (
          (group?.activateAll &&
            group?.layers.find(l => l.id === sl.id && l.main)) ||
          (!group?.activateAll && group?.layers.map(l => l.id).includes(sl.id))
        );
      })
    : [];

  const initialActiveLayer =
    selectedActiveLayer.length > 0 ? selectedActiveLayer[0].id : null;

  const [activeLayer, setActiveLayer] = useState(
    initialActiveLayer || (group?.layers?.find(l => l.main)?.id as string),
  );

  const validatedTitle = t(group?.groupTitle || layerTitle || '');

  const toggleLayerValue = (selectedLayerId: string, checked: boolean) => {
    // clear previous table dataset loaded first
    // to close the dataseries and thus close chart
    dispatch(clearDataset());

    const selectedLayer = group
      ? LayerDefinitions[selectedLayerId as LayerKey]
      : layer;

    const urlLayerKey = getUrlKey(selectedLayer);

    if (checked) {
      const updatedUrl = appendLayerToUrl(
        urlLayerKey,
        selectedLayers,
        selectedLayer,
      );

      updateHistory(urlLayerKey, updatedUrl);

      if (
        !('boundary' in selectedLayer) &&
        selectedLayer.type === 'admin_level_data'
      ) {
        refreshBoundaries(map, dispatch);
      }
    } else {
      removeLayerFromUrl(urlLayerKey, selectedLayer.id);
      dispatch(removeLayer(selectedLayer));

      // For admin boundary layers with boundary property
      // we have to de-activate the unique boundary and re-activate
      // default boundaries
      if ('boundary' in selectedLayer) {
        const boundaryId = selectedLayer.boundary || '';

        if (Object.keys(LayerDefinitions).includes(boundaryId)) {
          const displayBoundaryLayers = getDisplayBoundaryLayers();
          const uniqueBoundaryLayer = LayerDefinitions[boundaryId as LayerKey];

          if (
            !displayBoundaryLayers
              .map(l => l.id)
              .includes(uniqueBoundaryLayer.id)
          ) {
            safeDispatchRemoveLayer(map, uniqueBoundaryLayer, dispatch);
          }

          displayBoundaryLayers.forEach(l => {
            safeDispatchAddLayer(map, l, dispatch);
          });
        }
      }
    }
  };

  const handleSelect = (
    event: React.ChangeEvent<{ value: string | unknown }>,
  ) => {
    const selectedId = event.target.value;
    setActiveLayer(selectedId as string);
    toggleLayerValue(selectedId as string, true);
  };

  const menuTitle = group ? (
    <>
      <Typography className={selected ? classes.title : classes.titleUnchecked}>
        {validatedTitle}
      </Typography>
      {!group.activateAll && (
        <Select
          className={classes.select}
          classes={{
            root: selected ? classes.selectItem : classes.selectItemUnchecked,
          }}
          value={activeLayer}
          onChange={e => handleSelect(e)}
        >
          {group.layers.map(menu => (
            <MenuItem key={menu.id} value={menu.id}>
              {t(menu.label)}
            </MenuItem>
          ))}
        </Select>
      )}
    </>
  ) : (
    <Typography className={selected ? classes.title : classes.titleUnchecked}>
      {validatedTitle}
    </Typography>
  );

  return (
    <Box key={layerId} display="flex" alignItems="center" m={2}>
      <Switch
        size="small"
        className={classes.switch}
        classes={{
          switchBase: classes.switchBase,
          track: classes.switchTrack,
        }}
        checked={selected}
        onChange={e => toggleLayerValue(activeLayer, e.target.checked)}
        inputProps={{
          'aria-label': validatedTitle,
        }}
      />
      {menuTitle}
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
    </Box>
  );
}

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
  });

export interface SwitchItemProps extends WithStyles<typeof styles> {
  layer: LayerType;
}

export default withStyles(styles)(SwitchItem);
