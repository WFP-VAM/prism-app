import {
  Box,
  CircularProgress,
  createStyles,
  makeStyles,
  Typography,
} from '@material-ui/core';
import { LayerKey } from 'config/types';
import { useSafeTranslation } from 'i18n';
import { Map as MaplibreMap } from 'maplibre-gl';
import { memo, useEffect, useState } from 'react';
import { useMapState } from 'utils/useMapState';

export interface BoundaryLoadingOverlayProps {
  displayedBoundaryLayerIds: LayerKey[];
  viewKey: string;
}

const areBoundarySourcesLoaded = (
  map: MaplibreMap,
  boundaryLayerIds: LayerKey[],
) =>
  boundaryLayerIds.every(layerId => {
    const sourceId = `source-${layerId}`;
    try {
      return Boolean(map.getSource(sourceId)) && map.isSourceLoaded(sourceId);
    } catch {
      return false;
    }
  });

const BoundaryLoadingOverlay = memo(
  ({ displayedBoundaryLayerIds, viewKey }: BoundaryLoadingOverlayProps) => {
    const classes = useStyles();
    const { t } = useSafeTranslation();
    const map = useMapState().maplibreMap();
    const [visible, setVisible] = useState(true);

    // Each new view (the initial landing load or a freshly selected country)
    // starts a transition: show the overlay until the higher-res boundaries for
    // that view have settled.
    useEffect(() => {
      setVisible(true);
    }, [viewKey]);

    useEffect(() => {
      if (!map) {
        return undefined;
      }
      // The map only goes idle once it has stopped moving (e.g. after the
      // fitBounds transition into a country) and all tiles are loaded. We
      // dismiss only when the displayed boundary sources are fully loaded, so
      // cached low-zoom tiles don't hide the overlay before the high-res
      // boundaries finish loading. Because we only re-show on a view change,
      // later pan/zoom tile loads within the same view never re-trigger it.
      const handleIdle = () => {
        if (areBoundarySourcesLoaded(map, displayedBoundaryLayerIds)) {
          setVisible(false);
        }
      };
      map.on('idle', handleIdle);
      return () => {
        map.off('idle', handleIdle);
      };
    }, [map, viewKey, displayedBoundaryLayerIds]);

    if (!visible) {
      return null;
    }

    return (
      <Box className={classes.overlay} aria-live="polite" aria-busy="true">
        <Box className={classes.card}>
          <CircularProgress size={36} />
          <Typography variant="body2" className={classes.label}>
            {t('Loading boundaries…')}
          </Typography>
        </Box>
      </Box>
    );
  },
);

const useStyles = makeStyles(theme =>
  createStyles({
    overlay: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      pointerEvents: 'none',
      zIndex: 5,
    },
    card: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: theme.spacing(1.5),
      padding: theme.spacing(2, 3),
      borderRadius: theme.shape.borderRadius,
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      boxShadow: theme.shadows[3],
    },
    label: {
      color: theme.palette.text.secondary,
    },
  }),
);

export default BoundaryLoadingOverlay;
