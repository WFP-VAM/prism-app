import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  CircularProgress,
  createStyles,
  WithStyles,
  withStyles,
} from '@material-ui/core';
// map
import { PanelSize } from 'config/types';
import { getDisplayBoundaryLayers } from 'config/utils';

import { addLayer } from 'context/mapStateSlice';
import {
  isLoading as areDatesLoading,
  loadAvailableDates,
} from 'context/serverStateSlice';

import { appConfig } from 'config';
import { loadLayerData } from 'context/layers/layer-data';
import LeftPanel from './LeftPanel';
import MapComponent from './Map';
import OtherFeatures from './OtherFeatures';

const MapView = memo(({ classes }: MapViewProps) => {
  // App config attributes
  const { hidePanel } = appConfig;

  // Selectors
  const datesLoading = useSelector(areDatesLoading);

  // State attributes
  const [isAlertFormOpen, setIsAlertFormOpen] = useState(false);
  const [panelSize, setPanelSize] = useState<PanelSize>(PanelSize.medium);
  const [isPanelHidden, setIsPanelHidden] = useState<boolean>(
    Boolean(hidePanel),
  );

  const dispatch = useDispatch();

  /*
    reverse the order off adding layers so that the first boundary layer will be placed at the very bottom,
    to prevent other boundary layers being covered by any layers
  */
  const displayedBoundaryLayers = useMemo(() => {
    // eslint-disable-next-line fp/no-mutating-methods
    return getDisplayBoundaryLayers().reverse();
  }, []);

  const loadBoundaryLayerData = useCallback(() => {
    displayedBoundaryLayers.forEach(l => dispatch(addLayer(l)));
    displayedBoundaryLayers.forEach(l => dispatch(loadLayerData({ layer: l })));
  }, [dispatch, displayedBoundaryLayers]);

  useEffect(() => {
    dispatch(loadAvailableDates());

    // we must load boundary layer here for two reasons
    // 1. Stop showing two loading screens on startup - Mapbox renders its children very late, so we can't rely on BoundaryLayer to load internally
    // 2. Prevent situations where a user can toggle a layer like NSO (depends on Boundaries) before Boundaries finish loading.
    loadBoundaryLayerData();
  }, [dispatch, loadBoundaryLayerData]);

  return (
    <Box className={classes.root}>
      <LeftPanel
        panelSize={panelSize}
        setPanelSize={setPanelSize}
        isPanelHidden={isPanelHidden}
      />
      <OtherFeatures
        isAlertFormOpen={isAlertFormOpen}
        isPanelHidden={isPanelHidden}
        panelSize={panelSize}
        setIsAlertFormOpen={setIsAlertFormOpen}
        setIsPanelHidden={setIsPanelHidden}
      />
      {datesLoading && (
        <div className={classes.loading}>
          <CircularProgress size={100} />
        </div>
      )}
      <MapComponent
        panelHidden={isPanelHidden}
        setIsAlertFormOpen={setIsAlertFormOpen}
      />
    </Box>
  );
});

const styles = () =>
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
  });

export interface MapViewProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(MapView);
