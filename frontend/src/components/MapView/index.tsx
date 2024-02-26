import React, { memo, useEffect, useState } from 'react';
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
import { loadLayerData } from 'context/layers/layer-data';
import { Panel, leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import LeftPanel from './LeftPanel';
import MapComponent from './Map';
import OtherFeatures from './OtherFeatures';

/*
  reverse the order off adding layers so that the first boundary layer will be placed at the very bottom,
  to prevent other boundary layers being covered by any layers
*/
// eslint-disable-next-line fp/no-mutating-methods
const displayedBoundaryLayers = getDisplayBoundaryLayers().reverse();

const MapView = memo(({ classes, setIsAlertFormOpen }: MapViewProps) => {
  // Selectors
  const datesLoading = useSelector(areDatesLoading);
  const tabValue = useSelector(leftPanelTabValueSelector);

  // State attributes
  const [panelSize, setPanelSize] = useState<PanelSize>(PanelSize.medium);
  const isPanelHidden = tabValue === Panel.None;

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadAvailableDates());

    // we must load boundary layer here for two reasons
    // 1. Stop showing two loading screens on startup - maplibre renders its children very late, so we can't rely on BoundaryLayer to load internally
    // 2. Prevent situations where a user can toggle a layer like NSO (depends on Boundaries) before Boundaries finish loading.
    displayedBoundaryLayers.forEach(l => dispatch(addLayer(l)));
    displayedBoundaryLayers.forEach(l => dispatch(loadLayerData({ layer: l })));
  }, [dispatch]);

  return (
    <Box className={classes.root}>
      <LeftPanel
        panelSize={panelSize}
        setPanelSize={setPanelSize}
        isPanelHidden={isPanelHidden}
      />
      <OtherFeatures />
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

interface MapViewIncomingProps {
  setIsAlertFormOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface MapViewProps
  extends WithStyles<typeof styles>,
    MapViewIncomingProps {}

export default withStyles(styles)(MapView);
