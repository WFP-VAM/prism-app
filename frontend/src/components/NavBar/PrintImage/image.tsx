import {
  createStyles,
  Dialog,
  DialogContent,
  makeStyles,
} from '@material-ui/core';
import { usePostHog } from '@posthog/react';
import mask from '@turf/mask';
import { appConfig, configMap, safeCountry } from 'config';
import { AdminCodeString, LayerKey } from 'config/types';
import { getBoundaryLayerSingleton, LayerDefinitions } from 'config/utils';
import {
  addNotification,
  removeNotification,
} from 'context/notificationStateSlice';
import { availableDatesSelector } from 'context/serverStateSlice';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { debounce, get } from 'lodash';
import type { LngLatBounds } from 'maplibre-gl';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { isBoundaryLayer } from 'utils/boundary-layers-utils';
import { EXPORT_API_URL } from 'utils/constants';
import { getFormattedDate } from 'utils/date-utils';
import useLayers, { isWmsSelectableForBatchPrint } from 'utils/layers-utils';
import {
  DateCompatibleLayer,
  getPossibleDatesForLayer,
} from 'utils/server-utils';
import { stringHash } from 'utils/string-utils';
import { useBoundaryData } from 'utils/useBoundaryData';
import useResizeObserver from 'utils/useOnResizeObserver';

import {
  dateRangeSelector,
  mapSelector,
} from '../../../context/mapStateSlice/selectors';
import { useSafeTranslation } from '../../../i18n';
import {
  BatchCadence,
  filterDatesByCadence,
  getAvailableCadences,
  getDisabledCadences,
} from '../../../utils/batchCadenceUtils';
import {
  ALL_ASPECT_RATIO_OPTIONS,
  isCustomRatio,
} from '../../MapExport/aspectRatioConstants';
import { downloadToFile } from '../../MapView/utils';
import { calculateExportDimensions } from './mapDimensionsUtils';
import PrintConfig from './printConfig';
import PrintConfigContext, {
  MapDimensions,
  Toggles,
} from './printConfig.context';
import PrintPreview from './printPreview';

const defaultFooterText = get(appConfig, 'printConfig.defaultFooterText', '');

// Initial dimensions with 'Auto' aspect ratio (fills container)
const initialMapDimensions: MapDimensions = {
  aspectRatio: 'Auto',
};

// Debounce changes so that we don't redraw on every keystroke.
const debounceCallback = debounce((callback: any, ...args: any[]) => {
  callback(...args);
}, 750);

const boundaryLayer = getBoundaryLayerSingleton();

const UNSAFE_FILENAME_CHARS = new Set([
  '<',
  '>',
  ':',
  '"',
  '/',
  '\\',
  '|',
  '?',
  '*',
]);

function sanitizeFilenamePart(input: string): string {
  // Avoid control-character regexes (ESLint `no-control-regex`) by checking char codes.
  const sanitized = input
    .trim()
    .split('')
    .map(ch => {
      const code = ch.charCodeAt(0);
      const isControl = code < 32 || code === 127;
      return isControl || UNSAFE_FILENAME_CHARS.has(ch) ? '_' : ch;
    })
    .join('');

  // Collapse multiple underscores into a single underscore (e.g., "___" -> "_").
  return sanitized.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
}

function DownloadImage({ open, handleClose }: DownloadImageProps) {
  const { country, header } = appConfig;
  const logo = header?.logo;
  const bottomLogo = get(appConfig, 'printConfig.bottomLogo', undefined);
  const classes = useStyles();
  const selectedMap = useSelector(mapSelector);
  const dateRange = useSelector(dateRangeSelector);
  const printRef = useRef<HTMLDivElement>(null);
  const { data } = useBoundaryData(boundaryLayer.id);
  const dispatch = useDispatch();
  const posthog = usePostHog();
  const { t } = useSafeTranslation();

  // list of toggles
  const [toggles, setToggles] = useState<Toggles>({
    fullLayerDescription: true,
    countryMask: false,
    mapLabelsVisibility: true,
    logoVisibility: !!logo,
    legendVisibility: true,
    footerVisibility: true,
    batchMapsVisibility: false,
    bottomLogoVisibility: !!bottomLogo,
  });

  const [downloadMenuAnchorEl, setDownloadMenuAnchorEl] =
    useState<HTMLElement | null>(null);
  const [selectedBoundaries, setSelectedBoundaries] = useState<
    AdminCodeString[]
  >([]);
  const [titleText, setTitleText] = useState<string>(country);
  const [footerText, setFooterText] = useState(defaultFooterText);
  const [footerTextSize, setFooterTextSize] = useState(12);
  const [legendScale, setLegendScale] = useState(1);
  const [legendPosition, setLegendPosition] = useState(0);
  const [logoPosition, setLogoPosition] = useState(0);
  const [logoScale, setLogoScale] = useState(1);
  const [bottomLogoScale, setBottomLogoScale] = useState(1);
  // the % value of the original dimensions
  const [mapDimensions, setMapDimensions] =
    React.useState<MapDimensions>(initialMapDimensions);
  const [footerRef, { height: measuredFooterHeight }] =
    useResizeObserver<HTMLDivElement>(footerText, open);

  // Use measured footer height, or estimate if not yet measured
  // This prevents overlap between footer and scale/legend elements during initial render
  const footerHeight =
    measuredFooterHeight || (toggles.footerVisibility ? 60 : 0);
  const [titleRef, { height: titleHeight }] = useResizeObserver<HTMLDivElement>(
    titleText,
    open,
  );
  // Bounds and zoom captured from the preview map (no extra padding like main map)
  const [previewBounds, setPreviewBounds] = useState<LngLatBounds | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number | null>(null);
  // Map dimensions captured from the preview (used for 'Auto' aspect ratio in batch exports)
  const [previewMapWidth, setPreviewMapWidth] = useState<number | null>(null);
  const [previewMapHeight, setPreviewMapHeight] = useState<number | null>(null);

  // Get the style and layers of the old map
  const selectedMapStyle = selectedMap?.getStyle();

  if (selectedMapStyle && !toggles.mapLabelsVisibility) {
    selectedMapStyle.layers = selectedMapStyle?.layers.filter(
      x => !x.id.includes('label'),
    );
  }

  const [invertedAdminBoundaryLimitPolygon, setAdminBoundaryPolygon] =
    useState(null);

  const [dateRangeForBatchMaps, setDateRangeForBatchMaps] = useState<{
    startDate: number | null;
    endDate: number | null;
  }>({
    startDate: null,
    endDate: null,
  });

  const [cadence, setCadence] = useState<BatchCadence>('every-n-dekads');
  const [dekadInterval, setDekadInterval] = useState(1);

  const [isDownloading, setIsDownloading] = useState(false);

  const countryLayerIds = new Set(
    Object.keys(configMap[safeCountry].rawLayers),
  );
  const availableDates = useSelector(availableDatesSelector);
  const selectableLayers = Object.values(LayerDefinitions).filter(
    (l): l is DateCompatibleLayer =>
      isWmsSelectableForBatchPrint(l, availableDates) &&
      countryLayerIds.has(l.id),
  );
  const [selectedLayerId, setSelectedLayerId] = useState<LayerKey | null>(null);

  const { selectedLayersWithDateSupport, selectedLayers } = useLayers();

  useEffect(() => {
    if (open) {
      setSelectedLayerId(
        (selectedLayersWithDateSupport[0]?.id as LayerKey) ?? null,
      );
    }
  }, [open]);

  useEffect(() => {
    if (selectedLayerId === null && selectableLayers.length > 0) {
      setSelectedLayerId(selectableLayers[0].id);
    }
  }, [selectableLayers, selectedLayerId]);

  const printSelectedLayer = useMemo(
    () =>
      selectedLayerId
        ? (selectableLayers.find(l => l.id === selectedLayerId) ?? null)
        : null,
    [selectedLayerId, selectableLayers],
  );

  const availableCadences = useMemo(() => {
    const coverageWindow = printSelectedLayer
      ? printSelectedLayer.coverageWindow
      : selectedLayersWithDateSupport[0]?.coverageWindow;
    return getAvailableCadences(coverageWindow);
  }, [printSelectedLayer, selectedLayersWithDateSupport]);
  useEffect(() => {
    if (!availableCadences.includes(cadence)) {
      setCadence(availableCadences[0]);
    }
  }, [availableCadences, cadence]);

  const shouldEnableBatchMaps = false; // Temporarily disable batch maps;

  const shouldShowMultiLayerWarning = selectedLayersWithDateSupport.length > 1;

  useEffect(() => {
    if (shouldShowMultiLayerWarning) {
      setToggles(prev => ({ ...prev, batchMapsVisibility: false }));
    }
  }, [shouldShowMultiLayerWarning]);

  const hasNonDateLayers = useMemo(
    () =>
      selectedLayers.some(
        layer =>
          !isBoundaryLayer(layer) &&
          !selectedLayersWithDateSupport.some(dl => dl.id === layer.id),
      ),
    [selectedLayers, selectedLayersWithDateSupport],
  );

  const { filteredBatchDates, mapCount, uniqueQueryDates } = useMemo(() => {
    const { startDate, endDate } = dateRangeForBatchMaps;
    if (!startDate || !endDate || !printSelectedLayer) {
      return { filteredBatchDates: [], mapCount: 0, uniqueQueryDates: [] };
    }

    const dateItems = getPossibleDatesForLayer(
      printSelectedLayer,
      availableDates,
    );

    const startOfStartDate = new Date(startDate).setUTCHours(0, 0, 0, 0);
    const endOfEndDate = new Date(endDate).setUTCHours(23, 59, 59, 999);

    const rawUniqueDates = [...new Set(dateItems.map(item => item.queryDate))]
      .filter(d => d >= startOfStartDate && d <= endOfEndDate)
      .sort((a, b) => a - b);

    const coverageWindow = printSelectedLayer.coverageWindow;
    const dates = filterDatesByCadence(
      rawUniqueDates,
      cadence,
      dekadInterval,
      coverageWindow,
    );
    return {
      filteredBatchDates: dates,
      mapCount: dates.length,
      uniqueQueryDates: rawUniqueDates,
    };
  }, [
    availableDates,
    printSelectedLayer,
    dateRangeForBatchMaps,
    cadence,
    dekadInterval,
  ]);

  const disabledCadences = useMemo(
    () => getDisabledCadences(uniqueQueryDates, dekadInterval),
    [uniqueQueryDates, dekadInterval],
  );

  useEffect(() => {
    if (
      open &&
      toggles.batchMapsVisibility &&
      dateRangeForBatchMaps.startDate &&
      dateRangeForBatchMaps.endDate &&
      uniqueQueryDates.length > 0 &&
      filteredBatchDates.length === 0
    ) {
      dispatch(
        addNotification({
          type: 'error',
          message: t(
            'A map could not be made for the dates you selected. Please choose an earlier date range and/or a shorter cadence.',
          ),
        }),
      );
    }
  }, [
    open,
    filteredBatchDates,
    toggles.batchMapsVisibility,
    dateRangeForBatchMaps.startDate,
    dateRangeForBatchMaps.endDate,
    dispatch,
    t,
  ]);

  useEffect(() => {
    if (!open) {
      dispatch(
        removeNotification(
          stringHash(
            t(
              'A map could not be made for the dates you selected. Please choose an earlier date range and/or a shorter cadence.',
            ),
          ),
        ),
      );
    }
  }, [open, dispatch, t]);

  useEffect(() => {
    if (
      open &&
      toggles.batchMapsVisibility &&
      hasNonDateLayers &&
      printSelectedLayer
    ) {
      dispatch(
        addNotification({
          type: 'warning',
          message: t(
            'The sequence of maps will only display the {{layerTitle}} layer',
            { layerTitle: printSelectedLayer.title },
          ),
        }),
      );
    }
  }, [
    open,
    toggles.batchMapsVisibility,
    hasNonDateLayers,
    printSelectedLayer,
    dispatch,
    t,
  ]);

  useEffect(() => {
    // admin-boundary-unified-polygon.json is generated using "yarn preprocess-layers"
    // which runs ./scripts/preprocess-layers.js
    if (selectedBoundaries.length === 0) {
      fetch(`/data/${safeCountry}/admin-boundary-unified-polygon.json`)
        .then(response => response.json())
        .then(polygonData => {
          const maskedPolygon = mask(polygonData as any);
          setAdminBoundaryPolygon(maskedPolygon as any);
        })
        .catch(error => console.error('Error:', error));
      return;
    }

    const filteredData = data && {
      ...data,
      features: data.features.filter(cell =>
        selectedBoundaries.includes(cell.properties?.[boundaryLayer.adminCode]),
      ),
    };
    const masked = mask(filteredData as any);
    setAdminBoundaryPolygon(masked as any);
  }, [data, selectedBoundaries, selectedBoundaries.length]);

  const handleDownloadMenuClose = () => {
    setDownloadMenuAnchorEl(null);
  };

  const handleDownloadMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setDownloadMenuAnchorEl(event.currentTarget);
  };

  const download = (format: 'pdf' | 'jpeg' | 'png') => {
    posthog?.capture('map_print_downloaded', {
      format,
      title: titleText,
      date: getFormattedDate(dateRange.startDate, 'default'),
    });
    const filename: string = `${titleText || country}_${
      getFormattedDate(dateRange.startDate, 'snake') || 'no_date'
    }`;
    const docGeneration = async () => {
      // png is generally preferred for images containing lines and text.
      const ext = format === 'pdf' ? 'png' : format;
      const elem = printRef.current;
      if (!elem) {
        throw new Error('canvas is undefined');
      }
      const canvas = await html2canvas(elem);
      const file = canvas.toDataURL(`image/${ext}`);
      if (format === 'pdf') {
        const orientation =
          canvas.width > canvas.height ? 'landscape' : 'portrait';

        const pdf = new jsPDF({
          orientation,
          unit: 'px',
          format: [canvas.width, canvas.height],
        });
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const pdfWidth = pdf.internal.pageSize.getWidth();
        pdf.addImage(file, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        pdf.save(`${filename}.pdf`);
      } else {
        downloadToFile(
          { content: file, isUrl: true },
          filename,
          `image/${ext}`,
        );
      }
    };

    try {
      docGeneration();
    } catch (error) {
      console.error(error);
    }

    handleClose();
    handleDownloadMenuClose();
  };

  const downloadBatch = async (format: 'pdf' | 'png') => {
    const { startDate, endDate } = dateRangeForBatchMaps;

    if (!startDate || !endDate) {
      console.error('Date range not set for batch download');
      return;
    }

    setIsDownloading(true);
    handleDownloadMenuClose();

    posthog?.capture('batch_maps_downloaded', {
      format,
      title: titleText,
      start_date: getFormattedDate(startDate, 'default'),
      end_date: getFormattedDate(endDate, 'default'),
      cadence,
      dekad_interval: dekadInterval,
      map_count: filteredBatchDates.length,
    });

    try {
      if (!printSelectedLayer) {
        console.error('No layer selected for batch download');
        setIsDownloading(false);
        return;
      }

      const formattedDates = filteredBatchDates.map(timestamp =>
        getFormattedDate(timestamp, 'default'),
      );

      if (formattedDates.length === 0) {
        console.error('No dates found in the selected range');
        setIsDownloading(false);
        return;
      }

      // Use preview map bounds and zoom (captured from MapExportLayout via onBoundsChange)
      // This ensures we get the exact bounds/zoom shown in the preview, without the
      // extra left padding that the main map has for UI elements
      const mapBounds = previewBounds;
      const mapZoom = previewZoom;
      // Construct URLs for each date by adding `/export` to the pathname and setting the date param
      const { origin, pathname, search } = new URL(window.location.href);
      const exportPath = `${pathname.replace(/\/$/, '')}/export`;
      const baseParams = new URLSearchParams(search);

      // Calculate viewport dimensions for export
      // For 'Auto' aspect ratio, use the actual map dimensions from the preview
      const exportDims = calculateExportDimensions(
        mapDimensions.aspectRatio,
        mapDimensions.aspectRatio === 'Auto'
          ? (previewMapWidth ?? undefined)
          : undefined,
        mapDimensions.aspectRatio === 'Auto'
          ? (previewMapHeight ?? undefined)
          : undefined,
      );

      const constructedUrls = formattedDates
        .filter((date): date is string => date !== undefined)
        .map(date => {
          const params = new URLSearchParams(baseParams);
          params.set('date', date);
          params.set('hazardLayerIds', printSelectedLayer.id);
          params.delete('baselineLayerId');

          // Map bounds and zoom
          if (mapBounds) {
            const bounds = `${mapBounds.getWest()},${mapBounds.getSouth()},${mapBounds.getEast()},${mapBounds.getNorth()}`;
            params.set('bounds', bounds);
          }
          if (mapZoom != null) {
            params.set('zoom', String(mapZoom));
          }

          // Print config options
          // Map always fills viewport (100%), viewport dimensions maintain aspect ratio
          params.set('mapWidth', '100');
          params.set('mapHeight', '100');
          // Handle aspect ratio - could be string or object
          if (isCustomRatio(mapDimensions.aspectRatio)) {
            params.set('aspectRatio', 'Custom');
            params.set('customWidth', String(mapDimensions.aspectRatio.w));
            params.set('customHeight', String(mapDimensions.aspectRatio.h));
          } else {
            params.set('aspectRatio', mapDimensions.aspectRatio);
          }
          params.set('title', titleText);
          params.set('footer', footerText);
          params.set('footerTextSize', String(footerTextSize));

          // Position/scale
          params.set('logoPosition', String(logoPosition));
          params.set('logoScale', String(logoScale));
          params.set('legendPosition', String(legendPosition));
          params.set('legendScale', String(legendScale));
          params.set('bottomLogoScale', String(bottomLogoScale));

          // Toggles (as JSON, excluding batchMapsVisibility)
          const exportToggles = {
            fullLayerDescription: toggles.fullLayerDescription,
            countryMask: toggles.countryMask,
            mapLabelsVisibility: toggles.mapLabelsVisibility,
            logoVisibility: toggles.logoVisibility,
            legendVisibility: toggles.legendVisibility,
            footerVisibility: toggles.footerVisibility,
            bottomLogoVisibility: toggles.bottomLogoVisibility,
          };
          params.set('toggles', JSON.stringify(exportToggles));

          // Selected boundaries
          if (selectedBoundaries.length > 0) {
            params.set('selectedBoundaries', selectedBoundaries.join(','));
          }

          return `${origin}${exportPath}?${params.toString()}`;
        });

      const response = await fetch(`${EXPORT_API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: constructedUrls,
          viewportWidth: exportDims.canvasWidth,
          viewportHeight: exportDims.canvasHeight,
          format,
        }),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const startDateStr = getFormattedDate(startDate, 'snake');
      const endDateStr = getFormattedDate(endDate, 'snake');
      const cleanedTitle = (titleText || country).replace(
        /(\s*-\s*)?\{(date|date_coverage)\}/gi,
        '',
      );
      const safeTitle = sanitizeFilenamePart(cleanedTitle);
      const filename = `${safeTitle}_${startDateStr}_to_${endDateStr}`;
      // Server returns ZIP file when format is 'png'
      const contentType =
        format === 'pdf' ? 'application/pdf' : 'application/zip';

      downloadToFile(
        { content: downloadUrl, isUrl: true },
        filename,
        contentType,
      );

      dispatch(
        addNotification({
          type: 'success',
          message: t('Batch download completed successfully.'),
        }),
      );
    } catch (error) {
      dispatch(
        addNotification({
          type: 'error',
          message: t(
            'Something went wrong with the batch download. Please try again.',
          ),
        }),
      );
      console.error('Batch download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const printContext = {
    printConfig: {
      open,
      toggles,
      mapDimensions,
      footerHeight,
      selectedBoundaries,
      setDownloadMenuAnchorEl,
      titleText,
      titleRef,
      footerTextSize,
      footerText,
      footerRef,
      logoPosition,
      titleHeight,
      logoScale,
      legendPosition,
      legendScale,
      printRef,
      invertedAdminBoundaryLimitPolygon,
      handleClose,
      setTitleText,
      debounceCallback,
      country,
      setMapDimensions,
      logo,
      setLogoPosition,
      setLogoScale,
      bottomLogo,
      bottomLogoScale,
      setBottomLogoScale,
      setToggles,
      setLegendPosition,
      setFooterText,
      setFooterTextSize,
      handleDownloadMenuOpen,
      downloadMenuAnchorEl,
      handleDownloadMenuClose,
      download,
      downloadBatch,
      isDownloading,
      defaultFooterText,
      setSelectedBoundaries,
      setLegendScale,
      shouldEnableBatchMaps,
      shouldShowMultiLayerWarning,
      dateRange: dateRangeForBatchMaps,
      setDateRange: setDateRangeForBatchMaps,
      mapCount,
      cadence,
      setCadence,
      dekadInterval,
      setDekadInterval,
      filteredBatchDates,
      availableCadences,
      disabledCadences,
      aspectRatioOptions: ALL_ASPECT_RATIO_OPTIONS,
      previewBounds,
      setPreviewBounds,
      previewZoom,
      setPreviewZoom,
      previewMapWidth,
      setPreviewMapWidth,
      previewMapHeight,
      setPreviewMapHeight,
      selectableLayers,
      selectedLayerId,
      setSelectedLayerId,
    },
  };

  return (
    <PrintConfigContext.Provider value={printContext}>
      <Dialog
        maxWidth="xl"
        open={open}
        keepMounted
        onClose={() => handleClose()}
        aria-labelledby="dialog-preview"
      >
        <DialogContent className={classes.contentContainer}>
          <PrintPreview />
          <PrintConfig />
        </DialogContent>
      </Dialog>
    </PrintConfigContext.Provider>
  );
}

const useStyles = makeStyles(() =>
  createStyles({
    contentContainer: {
      fontFamily: 'Roboto',
      display: 'flex',
      gap: '1rem',
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '90vw',
      height: '90vh',
      maxWidth: '100%',
      maxHeight: '100%',
      boxSizing: 'border-box',
      paddingBottom: '20px',
    },
  }),
);

export interface DownloadImageProps {
  open: boolean;
  handleClose: () => void;
}

export default DownloadImage;
