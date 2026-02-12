import {
  Dialog,
  DialogContent,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import mask from '@turf/mask';
import html2canvas from 'html2canvas';
import { debounce, get } from 'lodash';
import { jsPDF } from 'jspdf';
import type { LngLatBounds } from 'maplibre-gl';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getFormattedDate } from 'utils/date-utils';
import { appConfig, safeCountry } from 'config';
import { AdminCodeString } from 'config/types';
import { getBoundaryLayerSingleton } from 'config/utils';
import useResizeObserver from 'utils/useOnResizeObserver';
import useLayers from 'utils/layers-utils';
import { availableDatesSelector } from 'context/serverStateSlice';
import { getPossibleDatesForLayer } from 'utils/server-utils';
import { useBoundaryData } from 'utils/useBoundaryData';
import { EXPORT_API_URL } from 'utils/constants';
import { addNotification } from 'context/notificationStateSlice';
import { downloadToFile } from '../../MapView/utils';
import {
  dateRangeSelector,
  mapSelector,
} from '../../../context/mapStateSlice/selectors';
import PrintConfig from './printConfig';
import PrintPreview from './printPreview';
import PrintConfigContext, {
  MapDimensions,
  Toggles,
} from './printConfig.context';
import { calculateExportDimensions } from './mapDimensionsUtils';
import {
  isCustomRatio,
  ALL_ASPECT_RATIO_OPTIONS,
} from '../../MapExport/aspectRatioConstants';
import { useSafeTranslation } from '../../../i18n';

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

  const [isDownloading, setIsDownloading] = useState(false);

  const { selectedLayersWithDateSupport } = useLayers();
  const availableDates = useSelector(availableDatesSelector);
  const shouldEnableBatchMaps =
    // selectedLayersWithDateSupport.length > 0 &&
    // selectedLayersWithDateSupport.every(layer => layer.type === 'wms');
    false; // Temporarily disable batch maps

  const mapCount = useMemo(() => {
    const { startDate, endDate } = dateRangeForBatchMaps;
    if (!startDate || !endDate || selectedLayersWithDateSupport.length === 0) {
      return 0;
    }

    const allDateItems = selectedLayersWithDateSupport.flatMap(layer =>
      getPossibleDatesForLayer(layer, availableDates),
    );

    const uniqueQueryDates = [
      ...new Set(allDateItems.map(item => item.queryDate)),
    ];

    return uniqueQueryDates.filter(
      queryDate => queryDate >= startDate && queryDate <= endDate,
    ).length;
  }, [availableDates, selectedLayersWithDateSupport, dateRangeForBatchMaps]);

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

    try {
      const allDateItems = selectedLayersWithDateSupport.flatMap(layer =>
        getPossibleDatesForLayer(layer, availableDates),
      );

      const uniqueQueryDates = [
        ...new Set(allDateItems.map(item => item.queryDate)),
      ];

      const filteredDates = uniqueQueryDates.filter(
        queryDate => queryDate >= startDate && queryDate <= endDate,
      );

      // Convert timestamps to YYYY-MM-DD format
      const formattedDates = filteredDates.map(timestamp =>
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
      dateRange: dateRangeForBatchMaps,
      setDateRange: setDateRangeForBatchMaps,
      mapCount,
      aspectRatioOptions: ALL_ASPECT_RATIO_OPTIONS,
      previewBounds,
      setPreviewBounds,
      previewZoom,
      setPreviewZoom,
      previewMapWidth,
      setPreviewMapWidth,
      previewMapHeight,
      setPreviewMapHeight,
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
