import React, { memo, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  CircularProgress,
  createStyles,
  makeStyles,
  IconButton,
  Tooltip,
  TextField,
} from '@material-ui/core';
import ImageIcon from '@material-ui/icons/Image';
import { Source, Layer } from 'react-map-gl/maplibre';
import html2canvas from 'html2canvas';
import { getDisplayBoundaryLayers, LayerDefinitions } from 'config/utils';
import {
  isLoading as areDatesLoading,
  loadAvailableDatesForLayer,
} from 'context/serverStateSlice';
import { useMapState } from 'utils/useMapState';
import { useDashboardMapSync } from 'utils/useDashboardMapSync';
import { MapInstanceProvider } from 'components/MapView/MapInstanceContext';
import { boundaryCache } from 'utils/boundary-cache';
import {
  selectedDashboardIndexSelector,
  setCapturedViewport,
  dashboardModeSelector,
} from 'context/dashboardStateSlice';
import useLayers from 'utils/layers-utils';
import { getNonBoundaryLayers } from 'utils/boundary-layers-utils';
import RootAccordionItems from 'components/MapView/LeftPanel/layersPanel/RootAccordionItems';
import {
  pointDataLayerDatesRequested,
  preloadLayerDatesArraysForPointData,
  preloadLayerDatesArraysForWMS,
  WMSLayerDatesRequested,
} from 'context/serverPreloadStateSlice';
import { useSafeTranslation } from 'i18n';
import { DashboardMode } from 'config/types';
import { downloadToFile } from 'components/MapView/utils';
import MapComponent from '../MapView/Map';
import DateSelector from '../MapView/DateSelector';
import DashboardLegends from './DashboardLegends';
import BlockPreviewHeader from './BlockPreviewHeader';
import type { ExportConfig } from './DashboardContent';

/*
  reverse the order off adding layers so that the first boundary layer will be placed at the very bottom,
  to prevent other boundary layers being covered by any layers
*/
// eslint-disable-next-line fp/no-mutating-methods
const displayedBoundaryLayers = getDisplayBoundaryLayers().reverse();

interface MapBlockProps {
  exportConfig?: ExportConfig;
  elementId: string;
}

const formatDateString = (date: number | string | Date) =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

const MapBlockContent = memo(({ exportConfig, elementId }: MapBlockProps) => {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const { selectedLayersWithDateSupport } = useLayers();
  const { actions, maplibreMap, layers, dateRange, mapTitle } = useMapState();
  const datesLoading = useSelector(areDatesLoading);
  const mode = useSelector(dashboardModeSelector);
  useDashboardMapSync(mode);
  const map = maplibreMap();
  const datesPreloadingForWMS = useSelector(WMSLayerDatesRequested);
  const datesPreloadingForPointData = useSelector(pointDataLayerDatesRequested);
  const dispatch = useDispatch();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const nonBoundaryLayers = getNonBoundaryLayers(layers);

  const title =
    mapTitle ||
    (mode === DashboardMode.PREVIEW && nonBoundaryLayers.length === 1
      ? t(
          LayerDefinitions[nonBoundaryLayers[0].id]?.title ||
            nonBoundaryLayers[0].id,
        )
      : null);

  const formatMapDate = () => {
    const { startDate, endDate } = dateRange;
    if (!startDate) {
      return '';
    }

    const startDateStr = formatDateString(startDate);

    if (endDate) {
      const endDateStr = formatDateString(endDate);
      return `${startDateStr} - ${endDateStr}`;
    }
    return startDateStr;
  };

  const handleDownloadMap = async () => {
    if (!mapContainerRef.current) {
      return;
    }
    try {
      const canvas = await html2canvas(mapContainerRef.current);
      const dataUrl = canvas.toDataURL('image/png');
      const filename = `map-${mapTitle || 'export'}-${formatMapDate() || 'snapshot'}.png`;
      downloadToFile({ content: dataUrl, isUrl: true }, filename, 'image/png');
    } catch (error) {
      console.error('Error downloading map:', error);
    }
  };

  if (mode === DashboardMode.PREVIEW) {
    const canvas = map?.getCanvas();
    if (canvas) {
      // eslint-disable-next-line fp/no-mutation
      canvas.style.cursor = 'default';
    }
  }

  if (mode === DashboardMode.EDIT) {
    const canvas = map?.getCanvas();
    if (canvas) {
      // eslint-disable-next-line fp/no-mutation
      canvas.style.cursor = 'inherit';
    }
  }

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
    actions,
    datesPreloadingForPointData,
    datesPreloadingForWMS,
    dispatch,
    mode,
    map,
  ]);

  const { layers: preselectedLayers } = useMapState();
  useEffect(() => {
    if (preselectedLayers.length > 0) {
      preselectedLayers.forEach(layer => {
        if (layer.type === 'wms' || layer.type === 'point_data') {
          dispatch(loadAvailableDatesForLayer(layer.id));
        }
      });
    }
  }, [preselectedLayers, dispatch]);

  const captureViewport = useCallback(() => {
    if (mode !== DashboardMode.EDIT || !map || elementId === undefined) {
      return;
    }

    const bounds = map.getBounds();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      dispatch(
        setCapturedViewport({
          elementId,
          bounds: [
            bounds.getWest(),
            bounds.getSouth(),
            bounds.getEast(),
            bounds.getNorth(),
          ],
        }),
      );
    }, 300); // 300ms debounce
  }, [mode, map, dispatch, elementId]);

  useEffect(() => {
    if (mode !== DashboardMode.EDIT || !map) {
      return undefined;
    }

    // Listen to map movement events
    map.on('moveend', captureViewport);
    map.on('zoomend', captureViewport);

    // Cleanup
    return () => {
      map.off('moveend', captureViewport);
      map.off('zoomend', captureViewport);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [mode, map, captureViewport]);

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (actions.updateMapTitle) {
      actions.updateMapTitle(event.target.value);
    }
  };

  return (
    <>
      {mode === DashboardMode.EDIT && (
        <Box className={classes.titleInputContainer}>
          <Typography variant="h3" className={classes.titleLabel}>
            {t('Map Title')}
          </Typography>
          <TextField
            value={mapTitle || ''}
            onChange={handleTitleChange}
            placeholder={t('Enter map title') as string}
            variant="outlined"
            size="small"
            fullWidth
            className={classes.titleInput}
          />
        </Box>
      )}
      <Box
        className={
          mode === DashboardMode.PREVIEW ? classes.rootPreview : classes.root
        }
      >
        {mode === DashboardMode.EDIT && (
          <div className={classes.leftPanel}>
            <RootAccordionItems />
          </div>
        )}
        <div
          className={
            mode === DashboardMode.PREVIEW
              ? classes.rightPanelPreview
              : classes.rightPanel
          }
        >
          {mode === DashboardMode.PREVIEW && (
            <div className={classes.previewHeaderContainer}>
              <BlockPreviewHeader
                title={title || ''}
                subtitle={formatMapDate()}
                downloadActions={
                  !exportConfig && (
                    <Tooltip title={t('Download PNG') as string}>
                      <IconButton onClick={handleDownloadMap} size="small">
                        <ImageIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )
                }
              />
            </div>
          )}
          <div
            ref={mapContainerRef}
            className={
              mode === DashboardMode.PREVIEW
                ? classes.mapContainerPreview
                : classes.mapContainerEdit
            }
          >
            {datesLoading && (
              <div className={classes.loading}>
                <CircularProgress size={100} />
              </div>
            )}
            <MapComponent
              hideMapLabels={
                exportConfig?.toggles?.mapLabelsVisibility === false
              }
            >
              {exportConfig?.toggles?.adminAreasVisibility &&
              exportConfig?.invertedAdminBoundaryLimitPolygon ? (
                <Source
                  key={`mask-${exportConfig.selectedBoundaries?.join('-') || 'all'}`}
                  id="dashboard-mask-overlay"
                  type="geojson"
                  data={exportConfig.invertedAdminBoundaryLimitPolygon}
                >
                  <Layer
                    id="dashboard-mask-layer-overlay"
                    type="fill"
                    source="dashboard-mask-overlay"
                    layout={{}}
                    paint={{
                      'fill-color': '#000',
                      'fill-opacity': 0.7,
                    }}
                  />
                </Source>
              ) : null}
            </MapComponent>
            {!datesLoading && <DashboardLegends exportConfig={exportConfig} />}
          </div>
          {mode === DashboardMode.EDIT &&
            selectedLayersWithDateSupport.length > 0 &&
            !datesLoading && (
              <div className={classes.dateSelectorContainer}>
                <DateSelector />
              </div>
            )}
        </div>
      </Box>
    </>
  );
});

const MapBlock = memo(({ elementId, exportConfig }: MapBlockProps) => {
  const selectedDashboardIndex = useSelector(selectedDashboardIndexSelector);

  return (
    <MapInstanceProvider
      key={`dashboard-${selectedDashboardIndex}-map-${elementId}`}
      elementId={elementId}
    >
      <MapBlockContent exportConfig={exportConfig} elementId={elementId} />
    </MapInstanceProvider>
  );
});

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      display: 'flex',
      minHeight: 0,
      width: '100%',
      position: 'relative',
      gap: '16px',
      overflow: 'hidden',
      flex: 1,
    },
    rootPreview: {
      display: 'flex',
      height: '100%',
      width: '100%',
      position: 'relative',
      gap: 0,
      overflow: 'hidden',
      flex: 1,
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
    titleInputContainer: {
      padding: '12px',
      marginBottom: '8px',
      borderBottom: '1px solid #e0e0e0',
      backgroundColor: '#fff',
    },
    titleLabel: {
      marginBottom: '6px',
      fontSize: '14px',
      fontWeight: 600,
    },
    titleInput: {
      '& .MuiOutlinedInput-input': {
        padding: '8px 12px',
      },
    },
    rightPanel: {
      flex: '0 0 66.667%',
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    rightPanelPreview: {
      flex: '1 1 100%',
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    previewHeaderContainer: {
      flex: '0 0 auto',
      background: 'white',
      borderRadius: 8,
    },
    mapContainerEdit: {
      flex: '0 0 550px',
      height: '550px',
      position: 'relative',
      '& > div': {
        height: '100%',
        width: '100%',
      },
    },
    mapContainerPreview: {
      flex: '1',
      height: '700px',
      minHeight: 0,
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
