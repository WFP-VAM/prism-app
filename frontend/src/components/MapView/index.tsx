import { Box, createStyles, makeStyles } from '@material-ui/core';
import { usePostHog } from '@posthog/react';
import { getBoundaryLayers } from 'config/utils';
import { clearAnalysisResult } from 'context/analysisResultStateSlice';
import {
  pointDataLayerDatesRequested,
  preloadLayerDatesArraysForPointData,
  preloadLayerDatesArraysForWMS,
  WMSLayerDatesRequested,
} from 'context/serverPreloadStateSlice';
import { useCountryIso } from 'context/useCountryIso';
import { usePerformanceMonitor } from 'hooks/usePerformanceMonitor';
import { memo, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { boundaryCache } from 'utils/boundary-cache';
import {
  applyUniversalLandingViewport,
  getCountryBbox,
  getDisplayBoundaryLayersForIso3,
  isUniversalDeployment,
} from 'utils/universal-utils';
import { useMapState } from 'utils/useMapState';

import BoundaryLoadingOverlay from './BoundaryLoadingOverlay';
import LeftPanel from './LeftPanel';
import MapComponent from './Map';
import OtherFeatures from './OtherFeatures';

// Sample the frame-rate monitor for a subset of sessions. The decision is made
// once at module load so it stays stable for the whole session and gates both
// the requestAnimationFrame loop and the PostHog telemetry it produces.
const PERF_MONITOR_SAMPLE_RATE = 0.1;
const isPerfMonitorSampled = Math.random() < PERF_MONITOR_SAMPLE_RATE;

const MapView = memo(() => {
  const classes = useStyles();
  const posthog = usePostHog();
  const { iso3 } = useCountryIso();

  usePerformanceMonitor({
    enabled: isPerfMonitorSampled,
    onSignificantChange: (fps, change) => {
      posthog?.capture('frame_rate', { fps, change });
    },
  });

  const displayedBoundaryLayers = useMemo(() => {
    const layers = getDisplayBoundaryLayersForIso3(iso3).reverse();
    return layers;
  }, [iso3]);

  const displayedBoundaryLayerIds = useMemo(
    () => displayedBoundaryLayers.map(layer => layer.id),
    [displayedBoundaryLayers],
  );

  const boundaryLoadingViewKey = iso3 ?? 'landing';

  const { actions, maplibreMap } = useMapState();
  const map = maplibreMap();
  const datesPreloadingForWMS = useSelector(WMSLayerDatesRequested);
  const datesPreloadingForPointData = useSelector(pointDataLayerDatesRequested);
  const dispatch = useDispatch();
  const prevIso3Ref = useRef(iso3);

  useEffect(() => {
    if (!isUniversalDeployment() || !map) {
      prevIso3Ref.current = iso3;
      return;
    }

    const previousIso3 = prevIso3Ref.current;
    prevIso3Ref.current = iso3;

    if (previousIso3 && !iso3) {
      applyUniversalLandingViewport(map, { animate: true, duration: 1500 });
    }
  }, [iso3, map]);

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
          animate: true,
          duration: 1500,
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
      {isUniversalDeployment() && (
        <BoundaryLoadingOverlay
          displayedBoundaryLayerIds={displayedBoundaryLayerIds}
          viewKey={boundaryLoadingViewKey}
        />
      )}
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
  }),
);

export default MapView;
