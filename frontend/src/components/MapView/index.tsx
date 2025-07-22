import { memo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  CircularProgress,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import { getDisplayBoundaryLayers } from 'config/utils';
import { addLayer } from 'context/mapStateSlice';
import { isLoading as areDatesLoading } from 'context/serverStateSlice';
import {
  layerDatesRequested,
  preloadLayerDatesArraysForPointData,
  preloadLayerDatesArraysForWMS,
} from 'context/serverPreloadStateSlice';
import { loadLayerData } from 'context/layers/layer-data';
import LeftPanel from './LeftPanel';
import MapComponent from './Map';
import OtherFeatures from './OtherFeatures';

/*
  reverse the order off adding layers so that the first boundary layer will be placed at the very bottom,
  to prevent other boundary layers being covered by any layers
*/
// eslint-disable-next-line fp/no-mutating-methods
const displayedBoundaryLayers = getDisplayBoundaryLayers().reverse();

const MapView = memo(() => {
  const classes = useStyles();

  // TODO: do we need this if we're preloading in the background?
  const datesLoading = useSelector(areDatesLoading);

  const datesPreloading = useSelector(layerDatesRequested);

  const dispatch = useDispatch();

  useEffect(() => {
    if (!datesPreloading) {
      dispatch(preloadLayerDatesArraysForWMS());
      dispatch(preloadLayerDatesArraysForPointData());
    }
    // we must load boundary layer here for two reasons
    // 1. Stop showing two loading screens on startup - maplibre renders its children very late, so we can't rely on BoundaryLayer to load internally
    // 2. Prevent situations where a user can toggle a layer like NSO (depends on Boundaries) before Boundaries finish loading.
    displayedBoundaryLayers.forEach(l => dispatch(addLayer(l)));
    displayedBoundaryLayers.forEach(l => dispatch(loadLayerData({ layer: l })));
  }, [dispatch, datesPreloading]);

  return (
    <Box className={classes.root}>
      <LeftPanel />
      <OtherFeatures />
      {datesLoading && (
        <div className={classes.loading}>
          <CircularProgress size={100} />
        </div>
      )}
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
