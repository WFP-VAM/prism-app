import { Box, createStyles, makeStyles } from '@material-ui/core';
import { getBoundaryLayers } from 'config/utils';
import { clearAnalysisResult } from 'context/analysisResultStateSlice';
import {
  pointDataLayerDatesRequested,
  preloadLayerDatesArraysForPointData,
  preloadLayerDatesArraysForWMS,
  WMSLayerDatesRequested,
} from 'context/serverPreloadStateSlice';
import { useCountryIso } from 'context/useCountryIso';
import { memo, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { boundaryCache } from 'utils/boundary-cache';
import {
  getCountryBbox,
  getDisplayBoundaryLayersForIso3,
  isUniversalDeployment,
} from 'utils/universal-utils';
import { useMapState } from 'utils/useMapState';

import LeftPanel from './LeftPanel';
import MapComponent from './Map';
import OtherFeatures from './OtherFeatures';

const MapView = memo(() => {
  const classes = useStyles();
  const { iso3 } = useCountryIso();

  const displayedBoundaryLayers = useMemo(() => {
    const layers = getDisplayBoundaryLayersForIso3(iso3).reverse();
    return layers;
  }, [iso3]);

  const { actions, maplibreMap } = useMapState();
  const map = maplibreMap();
  const datesPreloadingForWMS = useSelector(WMSLayerDatesRequested);
  const datesPreloadingForPointData = useSelector(pointDataLayerDatesRequested);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isUniversalDeployment() || !iso3) {
      return;
    }
    boundaryCache.clearCache();
    getBoundaryLayers().forEach(layer => actions.removeLayer(layer));
    dispatch(clearAnalysisResult());
  }, [iso3, actions, dispatch]);

  useEffect(() => {
    if (!datesPreloadingForPointData) {
      dispatch(preloadLayerDatesArraysForPointData());
    }
    if (!datesPreloadingForWMS) {
      dispatch(preloadLayerDatesArraysForWMS());
    }
    if (!map) {
      return undefined;
    }

    // we must load boundary layer here for two reasons
    // 1. Stop showing two loading screens on startup - maplibre renders its children very late, so we can't rely on BoundaryLayer to load internally
    // 2. Prevent situations where a user can toggle a layer like NSO (depends on Boundaries) before Boundaries finish loading.
    displayedBoundaryLayers.forEach(l => actions.addLayer(l));

    if (!isUniversalDeployment() || !iso3) {
      boundaryCache.preloadBoundaries(displayedBoundaryLayers, dispatch, map);
      return undefined;
    }

    const countryBbox = getCountryBbox(iso3);
    if (countryBbox) {
      map.fitBounds(
        [
          [countryBbox[0], countryBbox[1]],
          [countryBbox[2], countryBbox[3]],
        ],
        {
          padding: { top: 40, right: 40, bottom: 40, left: 420 },
          animate: false,
        },
      );
    }

    boundaryCache.preloadBoundaries(
      displayedBoundaryLayers,
      dispatch,
      map,
      iso3,
    );

    return undefined;
  }, [
    dispatch,
    datesPreloadingForWMS,
    datesPreloadingForPointData,
    map,
    actions,
    displayedBoundaryLayers,
    iso3,
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
