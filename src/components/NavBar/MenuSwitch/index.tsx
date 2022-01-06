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
import { addLayer, removeLayer } from '../../../context/mapStateSlice';
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
import { isLayerOnView } from '../../../utils/map-utils';

function MenuSwitch({ classes, title, layers, tables }: MenuSwitchProps) {
  const selectedLayers = useSelector(layersSelector);
  const map = useSelector(mapSelector);
  const dispatch = useDispatch();
  const { updateHistory, removeKeyFromUrl } = useUrlHistory();

  const toggleLayerValue = (layer: LayerType) => (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { checked } = event.target;

    const urlLayerKey =
      layer.type === 'admin_level_data' ? 'baselineLayerId' : 'hazardLayerId';

    if (checked) {
      updateHistory(urlLayerKey, layer.id);
      const primary = getBoundaryLayerSingleton();
      if (!('boundary' in layer)) {
        if (!isLayerOnView(map, primary.id)) {
          dispatch(addLayer(primary));
        }
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
          const uniqueBoundaryLayer = LayerDefinitions[boundaryId as LayerKey];
          dispatch(removeLayer(uniqueBoundaryLayer));

          const displayBoundaryLayers = getDisplayBoundaryLayers();
          displayBoundaryLayers.map(l => dispatch(addLayer(l)));
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
        {title}
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

        const validatedTitle = LayerGroup ? LayerGroup.name : layerTitle;

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
