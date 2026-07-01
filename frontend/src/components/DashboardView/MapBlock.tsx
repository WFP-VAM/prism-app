import ImageIcon from '@mui/icons-material/Image';
import {
  Box,
  CircularProgress,
  Icon,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Switch from 'components/Common/Switch';
import RootAccordionItems from 'components/MapView/LeftPanel/layersPanel/RootAccordionItems';
import { MapInstanceProvider } from 'components/MapView/MapInstanceContext';
import { downloadToFile } from 'components/MapView/utils';
import { DashboardMode, SelectedDateTimestamp } from 'config/types';
import { getDisplayBoundaryLayers, LayerDefinitions } from 'config/utils';
import {
  dashboardMapStateSelector,
  dashboardModeSelector,
  selectedDashboardIndexSelector,
  setCapturedViewport,
  setLegendPosition,
  setLegendVisible,
} from 'context/dashboardStateSlice';
import {
  pointDataLayerDatesRequested,
  preloadLayerDatesArraysForPointData,
  preloadLayerDatesArraysForWMS,
  WMSLayerDatesRequested,
} from 'context/serverPreloadStateSlice';
import {
  isLoading as areDatesLoading,
  loadAvailableDatesForLayer,
} from 'context/serverStateSlice';
import html2canvas from 'html2canvas';
import { useSafeTranslation } from 'i18n';
import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';
import { useDispatch, useSelector } from 'react-redux';
import { boundaryCache } from 'utils/boundary-cache';
import { getNonBoundaryLayers } from 'utils/boundary-layers-utils';
import { formatCoverageText, getFormattedDate } from 'utils/date-utils';
import useLayers from 'utils/layers-utils';
import { DateFormat } from 'utils/name-utils';
import { getLayersCoverage } from 'utils/server-utils';
import { useDashboardMapSync } from 'utils/useDashboardMapSync';
import { useMapState } from 'utils/useMapState';

import DateSelector from '../MapView/DateSelector';
import MapComponent from '../MapView/Map';
import BlockPreviewHeader from './BlockPreviewHeader';
import type { ExportConfig } from './DashboardContent';
import DashboardLegends from './DashboardLegends';
import {
  mapBlockDateSelectorContainerSx,
  mapBlockLeftPanelSx,
  mapBlockLegendPositionWrapperSx,
  mapBlockLegendSettingsContainerSx,
  mapBlockLegendToggleWrapperSx,
  mapBlockLoadingSx,
  mapBlockMapContainerEditSx,
  mapBlockMapContainerPreviewSx,
  mapBlockPreviewHeaderContainerSx,
  mapBlockRightPanelPreviewSx,
  mapBlockRightPanelSx,
  mapBlockRootPreviewSx,
  mapBlockRootSx,
  mapBlockTitleInputContainerSx,
  mapBlockTitleInputRowSx,
  mapBlockTitleInputSx,
  mapBlockTitleLabelSx,
  mapBlockToggleButtonGroupSx,
  mapBlockToggleButtonSx,
} from './mapBlockStyles';

/*
  reverse the order off adding layers so that the first boundary layer will be placed at the very bottom,
  to prevent other boundary layers being covered by any layers
*/

const displayedBoundaryLayers = getDisplayBoundaryLayers().reverse();

const legendPositionOptions = [
  {
    value: 0,
    comp: (
      <Icon style={{ color: 'black', transform: 'rotate(90deg)' }}>
        vertical_align_bottom
      </Icon>
    ),
  },
  {
    value: 1,
    comp: (
      <Icon style={{ color: 'black', transform: 'rotate(270deg)' }}>
        vertical_align_bottom
      </Icon>
    ),
  },
];

interface MapBlockProps {
  exportConfig?: ExportConfig;
  elementId: string;
}

const MapBlockContent = memo(({ exportConfig, elementId }: MapBlockProps) => {
  const { t } = useSafeTranslation();
  const { selectedLayersWithDateSupport } = useLayers();
  const { actions, maplibreMap, layers, dateRange, mapTitle } = useMapState();
  const datesLoading = useSelector(areDatesLoading);
  const mode = useSelector(dashboardModeSelector);
  const mapState = useSelector(dashboardMapStateSelector(elementId));
  useDashboardMapSync(mode);
  const map = maplibreMap();
  const datesPreloadingForWMS = useSelector(WMSLayerDatesRequested);
  const datesPreloadingForPointData = useSelector(pointDataLayerDatesRequested);
  const dispatch = useDispatch();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const legendVisible = mapState?.legendVisible ?? true;
  const legendPosition = mapState?.legendPosition ?? 'right';
  const useLatestAvailableDate = mapState?.useLatestAvailableDate ?? false;
  // Convert 'left'/'right' to 0/1 for ToggleButtonGroup
  const legendPositionValue = legendPosition === 'left' ? 0 : 1;

  const nonBoundaryLayers = getNonBoundaryLayers(layers);

  const title =
    mapTitle ||
    (mode === DashboardMode.VIEW && nonBoundaryLayers.length === 1
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

    // Use a locale-aware format so the month name follows the selected language.
    const dateLocale = t('date_locale');
    const startDateStr = getFormattedDate(
      startDate,
      DateFormat.DayFirstHyphenMonthName,
      dateLocale,
    );

    if (endDate) {
      const endDateStr = getFormattedDate(
        endDate,
        DateFormat.DayFirstHyphenMonthName,
        dateLocale,
      );
      return `${startDateStr} - ${endDateStr}`;
    }
    return startDateStr;
  };

  // When the displayed layer(s) have a configured coverage period, show that
  // instead of the plain selected date to give the proper context of the map.
  const coverageText = useMemo(
    () =>
      formatCoverageText(
        getLayersCoverage(
          selectedLayersWithDateSupport,
          dateRange.startDate as SelectedDateTimestamp,
        ),
        t,
        DateFormat.DayFirstHyphenMonthName,
      ),
    [selectedLayersWithDateSupport, dateRange.startDate, t],
  );

  // Only show a date/coverage subtitle when the map actually has a layer with
  // date context. Layers without dates (e.g. Multidimensional Poverty Index)
  // should not get a date appended to their title.
  const mapSubtitle =
    coverageText ||
    (selectedLayersWithDateSupport.length > 0 ? formatMapDate() : '');

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

  const handleLegendVisibleChange = (
    _event: React.ChangeEvent<HTMLInputElement>,
    checked: boolean,
  ) => {
    dispatch(setLegendVisible({ elementId, visible: checked }));
  };

  const handleLegendPositionChange = (
    _event: React.MouseEvent<HTMLElement>,
    value: number,
  ) => {
    if (value !== null) {
      dispatch(
        setLegendPosition({
          elementId,
          position: value === 0 ? 'left' : 'right',
        }),
      );
    }
  };

  return (
    <>
      {mode === DashboardMode.EDIT && (
        <Box sx={mapBlockTitleInputContainerSx}>
          <Typography variant="h3" sx={mapBlockTitleLabelSx}>
            {t('Map Title')}
          </Typography>
          <Box sx={mapBlockTitleInputRowSx}>
            <TextField
              value={mapTitle || ''}
              onChange={handleTitleChange}
              placeholder={t('Enter map title') as string}
              variant="outlined"
              size="small"
              fullWidth
              sx={mapBlockTitleInputSx}
            />
          </Box>
        </Box>
      )}
      <Box
        sx={
          mode === DashboardMode.VIEW ? mapBlockRootPreviewSx : mapBlockRootSx
        }
      >
        {mode === DashboardMode.EDIT && (
          <Box sx={mapBlockLeftPanelSx}>
            <Box sx={mapBlockLegendSettingsContainerSx}>
              <Box sx={mapBlockLegendToggleWrapperSx}>
                <Box
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Switch
                    checked={legendVisible}
                    onChange={handleLegendVisibleChange}
                    title={t('Legend')}
                  />
                </Box>

                {legendVisible && (
                  <Box sx={mapBlockLegendPositionWrapperSx}>
                    <Typography
                      component="h4"
                      style={{
                        textAlign: 'start',
                        marginRight: '0.5rem',
                        color: 'black',
                      }}
                    >
                      {t('Position')}
                    </Typography>
                    <ToggleButtonGroup
                      value={legendPositionValue}
                      exclusive
                      onChange={handleLegendPositionChange}
                      sx={mapBlockToggleButtonGroupSx}
                    >
                      {legendPositionOptions.map(option => (
                        <ToggleButton
                          key={option.value}
                          sx={mapBlockToggleButtonSx}
                          value={option.value}
                        >
                          {option.comp}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  </Box>
                )}
              </Box>
            </Box>
            <RootAccordionItems />
          </Box>
        )}
        <Box
          sx={
            mode === DashboardMode.VIEW
              ? mapBlockRightPanelPreviewSx
              : mapBlockRightPanelSx
          }
        >
          {mode === DashboardMode.VIEW && (
            <Box sx={mapBlockPreviewHeaderContainerSx}>
              <BlockPreviewHeader
                title={t(title || '')}
                subtitle={mapSubtitle}
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
            </Box>
          )}
          <Box
            ref={mapContainerRef}
            sx={
              mode === DashboardMode.VIEW
                ? mapBlockMapContainerPreviewSx
                : mapBlockMapContainerEditSx
            }
          >
            {datesLoading && (
              <Box sx={mapBlockLoadingSx}>
                <CircularProgress size={100} />
              </Box>
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
            {!datesLoading && (
              <DashboardLegends
                exportConfig={exportConfig}
                legendVisible={legendVisible}
                legendPosition={legendPosition}
              />
            )}
          </Box>
          {mode === DashboardMode.EDIT &&
            selectedLayersWithDateSupport.length > 0 &&
            !datesLoading && (
              <Box
                sx={mapBlockDateSelectorContainerSx}
                style={
                  useLatestAvailableDate
                    ? { opacity: 0.4, pointerEvents: 'none' }
                    : undefined
                }
              >
                <DateSelector />
              </Box>
            )}
        </Box>
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

export default MapBlock;
