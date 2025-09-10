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
import {
  isLoading as areDatesLoading,
  loadAvailableDates,
} from 'context/serverStateSlice';
import { loadLayerData } from 'context/layers/layer-data';
import { mapSelector } from 'context/mapStateSlice/selectors';
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
  // Selectors
  const datesLoading = useSelector(areDatesLoading);
  const map = useSelector(mapSelector);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadAvailableDates());

    // we must load boundary layer here for two reasons
    // 1. Stop showing two loading screens on startup - maplibre renders its children very late, so we can't rely on BoundaryLayer to load internally
    // 2. Prevent situations where a user can toggle a layer like NSO (depends on Boundaries) before Boundaries finish loading.
    displayedBoundaryLayers.forEach(l => dispatch(addLayer(l)));
    // TODO: Look into deduping this. It's not currently triggered multiple times but it could easily be.
    displayedBoundaryLayers.forEach(l =>
      dispatch(loadLayerData({ layer: l, map })),
    );
  }, [dispatch, map]);

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
