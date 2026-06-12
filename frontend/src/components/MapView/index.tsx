import { Box } from '@mui/material';
import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
import { getDisplayBoundaryLayers } from 'config/utils';
import {
  pointDataLayerDatesRequested,
  preloadLayerDatesArraysForPointData,
  preloadLayerDatesArraysForWMS,
  WMSLayerDatesRequested,
} from 'context/serverPreloadStateSlice';
import { memo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { boundaryCache } from 'utils/boundary-cache';
import { useMapState } from 'utils/useMapState';

import LeftPanel from './LeftPanel';
import MapComponent from './Map';
import OtherFeatures from './OtherFeatures';
/*
  reverse the order off adding layers so that the first boundary layer will be placed at the very bottom,
  to prevent other boundary layers being covered by any layers
*/

const displayedBoundaryLayers = getDisplayBoundaryLayers().reverse();

const MapView = memo(() => {
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
      <LeftPanel />
      <OtherFeatures />
      <MapComponent />
    </Box>
  );
});

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      height: '100%',
      width: '100%',
      position: 'relative',
    },
    loading: {
      position: 'absolute',
      height: '100%',
      width: '100%',
      backgroundColor: 'black',
      opacity: 0.75,
      zIndex: 1,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
  }),
);

export default MapView;
