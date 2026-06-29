import { Box, CircularProgress, Typography } from '@mui/material';
import { LayerKey } from 'config/types';
import { useSafeTranslation } from 'i18n';
import { Map as MaplibreMap } from 'maplibre-gl';
import { memo, useEffect, useState } from 'react';
import { useMapState } from 'utils/useMapState';

export interface BoundaryLoadingOverlayProps {
  displayedBoundaryLayerIds: LayerKey[];
  viewKey: string;
}

const overlaySx = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  pointerEvents: 'none',
  zIndex: 5,
} as const;

const cardSx = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 1.5,
  p: '16px 24px',
  borderRadius: 1,
  backgroundColor: 'rgba(255, 255, 255, 0.85)',
  boxShadow: 3,
} as const;

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
    const { t } = useSafeTranslation();
    const map = useMapState().maplibreMap();
    const [visible, setVisible] = useState(true);

    useEffect(() => {
      setVisible(true);
    }, [viewKey]);

    useEffect(() => {
      if (!map) {
        return undefined;
      }
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
      <Box sx={overlaySx} aria-live="polite" aria-busy="true">
        <Box sx={cardSx}>
          <CircularProgress size={36} />
          <Typography variant="body2" color="text.secondary">
            {t('Loading boundaries…')}
          </Typography>
        </Box>
      </Box>
    );
  },
);

export default BoundaryLoadingOverlay;
