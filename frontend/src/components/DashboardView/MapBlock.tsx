import { memo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  CircularProgress,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import { getDisplayBoundaryLayers } from 'config/utils';
import {
  isLoading as areDatesLoading,
  loadAvailableDates,
} from 'context/serverStateSlice';
import { loadLayerData } from 'context/layers/layer-data';
import { useMapState } from 'utils/useMapState';
import { MapInstanceProvider } from 'components/MapView/MapInstanceContext';
import { selectedDashboardIndexSelector } from 'context/dashboardStateSlice';
import useLayers from 'utils/layers-utils';
import RootAccordionItems from 'components/MapView/LeftPanel/layersPanel/RootAccordionItems';
import MapComponent from '../MapView/Map';
import DateSelector from '../MapView/DateSelector';
import DashboardLegends from './DashboardLegends';

/*
  reverse the order off adding layers so that the first boundary layer will be placed at the very bottom,
  to prevent other boundary layers being covered by any layers
*/
// eslint-disable-next-line fp/no-mutating-methods
const displayedBoundaryLayers = getDisplayBoundaryLayers().reverse();

interface MapBlockProps {
  mapIndex: number;
}

const MapBlockContent = memo(() => {
  const classes = useStyles();
  const { selectedLayersWithDateSupport } = useLayers();
  const { actions, maplibreMap } = useMapState();
  const datesLoading = useSelector(areDatesLoading);
  const map = maplibreMap();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadAvailableDates());
    // we must load boundary layer here for two reasons
    // 1. Stop showing two loading screens on startup - maplibre renders its children very late, so we can't rely on BoundaryLayer to load internally
    // 2. Prevent situations where a user can toggle a layer like NSO (depends on Boundaries) before Boundaries finish loading.
    displayedBoundaryLayers.forEach(l => actions.addLayer(l));
    // TODO: Look into deduping this. It's not currently triggered multiple times but it could easily be.
    displayedBoundaryLayers.forEach(l =>
      dispatch(loadLayerData({ layer: l, map })),
    );
  }, [actions, dispatch, map]);

  return (
    <Box className={classes.root}>
      <div className={classes.leftPanel}>
        <RootAccordionItems />
      </div>
      <div className={classes.rightPanel}>
        {datesLoading && (
          <div className={classes.loading}>
            <CircularProgress size={100} />
          </div>
        )}
        <div className={classes.mapContainer}>
          <MapComponent />
          {!datesLoading && <DashboardLegends />}
        </div>
        {selectedLayersWithDateSupport.length > 0 && !datesLoading && (
          <div className={classes.dateSelectorContainer}>
            <Typography variant="h3">Map date</Typography>
            <DateSelector />
          </div>
        )}
      </div>
    </Box>
  );
});

const MapBlock = memo(({ mapIndex }: MapBlockProps) => {
  const selectedDashboardIndex = useSelector(selectedDashboardIndexSelector);

  return (
    <MapInstanceProvider
      key={`dashboard-${selectedDashboardIndex}-map-${mapIndex}`}
      index={mapIndex}
    >
      <MapBlockContent />
    </MapInstanceProvider>
  );
});

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      display: 'flex',
      height: '100%',
      width: '100%',
      position: 'relative',
      gap: '16px',
      overflow: 'hidden',
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
    leftPanel: {
      flex: '0 0 33.333%',
      minWidth: 0,
      overflow: 'auto',
      maxHeight: '100%',
    },
    rightPanel: {
      flex: '0 0 66.667%',
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      overflow: 'hidden',
    },
    mapContainer: {
      flex: '1',
      minHeight: 0, // Allows flex item to shrink
      position: 'relative',
      '& > div': {
        height: '100%',
        width: '100%',
      },
    },
    dateSelectorContainer: {
      flex: '0 0 auto',
      height: 'auto',
      width: '100%',
      '& > div': {
        position: 'relative !important',
        bottom: 'auto !important',
        width: '100% !important',
      },
      '& h3': {
        marginBottom: '8px',
      },
    },
  }),
);

export default MapBlock;
