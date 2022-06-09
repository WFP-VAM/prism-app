import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  createStyles,
  MenuItem,
  Select,
  Switch,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { LayerKey, LayerType } from '../../../../config/types';
import {
  getDisplayBoundaryLayers,
  getBoundaryLayerSingleton,
  LayerDefinitions,
} from '../../../../config/utils';
import {
  safeDispatchAddLayer,
  safeDispatchRemoveLayer,
} from '../../../../utils/map-utils';
import {
  layersSelector,
  mapSelector,
} from '../../../../context/mapStateSlice/selectors';
import { useUrlHistory } from '../../../../utils/url-utils';
import { removeLayer } from '../../../../context/mapStateSlice';
import { useSafeTranslation } from '../../../../i18n';
import { clearDataset } from '../../../../context/datasetStateSlice';

const appendLayerToUrl = (
  urlLayers: string | null,
  selectedLayers: LayerType[],
  layer: LayerType,
): string => {
  const selectedLayersUrl = urlLayers !== null ? urlLayers.split(',') : [];

  const filteredSelectedLayers = selectedLayers
    .filter(l => selectedLayersUrl.includes(l.id) && l.type !== layer.type)
    .map(l => l.id);

  const updatedUrl =
    filteredSelectedLayers.length !== 0
      ? [...filteredSelectedLayers, layer.id]
      : [layer.id];

  return updatedUrl.join(',');
};

const removeLayerFromUrl = (
  urlLayers: string | null,
  layerId: string,
): string => {
  const selectedLayersUrl = urlLayers !== null ? urlLayers.split(',') : [];

  return selectedLayersUrl.filter(l => l !== layerId).join(',');
};

function SwitchItem({ classes, layer }: SwitchItemProps) {
  const { t } = useSafeTranslation();
  const selectedLayers = useSelector(layersSelector);
  const map = useSelector(mapSelector);
  const dispatch = useDispatch();
  const { updateHistory, removeKeyFromUrl, urlParams } = useUrlHistory();

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
    const ADMIN_LEVEL_DATA_LAYER_KEY = 'admin_level_data';

    // clear previous table dataset loaded first
    // to close the dataseries and thus close chart
    dispatch(clearDataset());

    const urlLayerKey =
      layer.type === ADMIN_LEVEL_DATA_LAYER_KEY
        ? 'baselineLayerId'
        : 'hazardLayerId';

    const selectedLayer = group
      ? LayerDefinitions[selectedLayerId as LayerKey]
      : layer;

    if (checked) {
      const updatedUrl = appendLayerToUrl(
        urlParams.get(urlLayerKey),
        selectedLayers,
        selectedLayer,
      );

      updateHistory(urlLayerKey, updatedUrl);

      const defaultBoundary = getBoundaryLayerSingleton();
      if (
        !('boundary' in selectedLayer) &&
        selectedLayer.type === ADMIN_LEVEL_DATA_LAYER_KEY
      ) {
        safeDispatchAddLayer(map, defaultBoundary, dispatch);
      }
    } else {
      const updatedUrl = removeLayerFromUrl(
        urlParams.get(urlLayerKey),
        selectedLayer.id,
      );

      if (updatedUrl === '') {
        removeKeyFromUrl(urlLayerKey);
      } else {
        updateHistory(urlLayerKey, updatedUrl);
      }

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
      <Typography className={classes.title}>{validatedTitle}</Typography>
      {!group.activateAll && (
        <Select
          className={classes.select}
          classes={{ root: classes.selectItem }}
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
    <Typography className={classes.title}>{validatedTitle}</Typography>
  );

  return (
    <Box key={layerId} display="flex" mb={1}>
      <Switch
        size="small"
        color="default"
        className={classes.switch}
        checked={selected}
        onChange={e => toggleLayerValue(activeLayer, e.target.checked)}
        inputProps={{
          'aria-label': validatedTitle,
        }}
      />
      {menuTitle}
    </Box>
  );
}

const styles = () =>
  createStyles({
    title: {
      lineHeight: 1.8,
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
      padding: 0,
      marginLeft: 5,
    },
    switch: {
      marginRight: 2,
    },
  });

export interface SwitchItemProps extends WithStyles<typeof styles> {
  layer: LayerType;
}

export default withStyles(styles)(SwitchItem);
