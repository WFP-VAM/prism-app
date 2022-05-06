import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Button,
  createStyles,
  Grid,
  Switch,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import {
  LayerKey,
  LayersCategoryType,
  LayerType,
  TableType,
} from '../../../config/types';
import { loadTable } from '../../../context/tableStateSlice';
import {
  layersSelector,
  mapSelector,
} from '../../../context/mapStateSlice/selectors';
import { useUrlHistory } from '../../../utils/url-utils';
import {
  getDisplayBoundaryLayers,
  getBoundaryLayerSingleton,
  LayerDefinitions,
} from '../../../config/utils';
import {
  safeDispatchAddLayer,
  safeDispatchRemoveLayer,
} from '../../../utils/map-utils';
import { removeLayer } from '../../../context/mapStateSlice';
import { useSafeTranslation } from '../../../i18n';
import { clearDataset } from '../../../context/datasetStateSlice';

function MenuSwitch({ classes, title, layers, tables }: MenuSwitchProps) {
  const { t } = useSafeTranslation();
  const selectedLayers = useSelector(layersSelector);
  const map = useSelector(mapSelector);
  const dispatch = useDispatch();
  const { updateHistory, removeKeyFromUrl } = useUrlHistory();

  const toggleLayerValue = (layer: LayerType) => (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const ADMIN_LEVEL_DATA_LAYER_KEY = 'admin_level_data';
    const { checked } = event.target;

    // clear previous table dataset loaded first
    // to close the dataseries and thus close chart
    dispatch(clearDataset());

    const urlLayerKey =
      layer.type === ADMIN_LEVEL_DATA_LAYER_KEY
        ? 'baselineLayerId'
        : 'hazardLayerId';

    if (checked) {
      updateHistory(urlLayerKey, layer.id);

      const defaultBoundary = getBoundaryLayerSingleton();
      if (!('boundary' in layer) && layer.type === ADMIN_LEVEL_DATA_LAYER_KEY) {
        safeDispatchAddLayer(map, defaultBoundary, dispatch);
      }
    } else {
      removeKeyFromUrl(urlLayerKey);
      dispatch(removeLayer(layer));

      // For admin boundary layers with boundary property
      // we have to de-activate the unique boundary and re-activate
      // default boundaries
      if ('boundary' in layer) {
        const boundaryId = layer.boundary || '';

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

  const showTableClicked = (table: TableType) => {
    dispatch(loadTable(table.id));
  };

  return (
    <Grid item key={title} className={classes.categoryContainer}>
      <Typography variant="body2" className={classes.categoryTitle}>
        {t(title)}
      </Typography>
      <hr />

      {layers.map(layer => {
        const { id: layerId, title: layerTitle, group: LayerGroup } = layer;
        if (LayerGroup && !LayerGroup.main) {
          return null;
        }

        const selected = selectedLayers.some(
          ({ id: testId }) => testId === layerId,
        );

        const validatedTitle = t(LayerGroup?.name || layerTitle || '');

        return (
          <Box key={layerId} display="flex" mb={1}>
            <Switch
              size="small"
              color="default"
              checked={selected}
              onChange={toggleLayerValue(layer)}
              inputProps={{
                'aria-label': validatedTitle,
              }}
            />{' '}
            <Typography variant="body1">{validatedTitle}</Typography>
          </Box>
        );
      })}

      {tables.map(table => (
        <Button
          id={table.title}
          key={table.title}
          onClick={() => showTableClicked(table)}
        >
          <Typography variant="body1">{table.title}</Typography>
        </Button>
      ))}
    </Grid>
  );
}

const styles = () =>
  createStyles({
    categoryContainer: {
      marginBottom: 16,
      '&:last-child': {
        marginBottom: 0,
      },
    },

    categoryTitle: {
      fontWeight: 'bold',
      textAlign: 'left',
    },
  });

export interface MenuSwitchProps
  extends LayersCategoryType,
    WithStyles<typeof styles> {}

export default withStyles(styles)(MenuSwitch);
