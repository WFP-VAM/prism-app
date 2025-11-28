import { memo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, createStyles, makeStyles } from '@material-ui/core';
import { getDisplayBoundaryLayers } from 'config/utils';
import {
  WMSLayerDatesRequested,
  pointDataLayerDatesRequested,
  preloadLayerDatesArraysForPointData,
  preloadLayerDatesArraysForWMS,
} from 'context/serverPreloadStateSlice';
import { useMapState } from 'utils/useMapState';
import { boundaryCache } from 'utils/boundary-cache';
import MapComponent from '../MapView/Map';

/**
 * ExportView is a component that displays a map and allows the user to export it as a PDF or ZIP file.
 *
 * It is basically a simplified version of MapView that does not display the left panel and other features.
 */

/*
  reverse the order off adding layers so that the first boundary layer will be placed at the very bottom,
  to prevent other boundary layers being covered by any layers
*/
// eslint-disable-next-line fp/no-mutating-methods
const displayedBoundaryLayers = getDisplayBoundaryLayers().reverse();

const ExportView = memo(() => {
  const classes = useStyles();

  // Selectors
  const { actions, maplibreMap } = useMapState();
  const map = maplibreMap();
  const datesPreloadingForWMS = useSelector(WMSLayerDatesRequested);
  const datesPreloadingForPointData = useSelector(pointDataLayerDatesRequested);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!datesPreloadingForPointData) {
      dispatch(preloadLayerDatesArraysForPointData());
    }
    if (!datesPreloadingForWMS) {
      dispatch(preloadLayerDatesArraysForWMS());
    }
    // we must load boundary layer here for two reasons
    // 1. Stop showing two loading screens on startup - maplibre renders its children very late, so we can't rely on BoundaryLayer to load internally
    // 2. Prevent situations where a user can toggle a layer like NSO (depends on Boundaries) before Boundaries finish loading.
    displayedBoundaryLayers.forEach(l => actions.addLayer(l));
    // Load boundary data into global cache (shared across all maps)
    boundaryCache.preloadBoundaries(displayedBoundaryLayers, dispatch, map);
  }, [
    dispatch,
    datesPreloadingForWMS,
    datesPreloadingForPointData,
    map,
    actions,
  ]);

  return (
    <Box className={classes.root}>
      <MapComponent />
    </Box>
  );
});

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      height: '100vh',
      width: '100%',
      position: 'relative',
    },
  }),
);

export default ExportView;
