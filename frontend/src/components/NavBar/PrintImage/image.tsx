import {
  Box,
  createStyles,
  Dialog,
  DialogContent,
  makeStyles,
} from '@material-ui/core';
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
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { isBoundaryLayer } from 'utils/boundary-layers-utils';
import { dateWithoutTime, getFormattedDate } from 'utils/date-utils';
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
import { getMapExportPageOrigin } from '../../../utils/constants';
import { ALL_ASPECT_RATIO_OPTIONS } from '../../MapExport/aspectRatioConstants';
import { downloadToFile } from '../../MapView/utils';
import {
  buildBatchArtifactBasenames,
  buildBatchExportDatesDisplay,
} from './batchMapExport/batchExportArtifactFilename';
import { buildBatchExportUrls } from './batchMapExport/buildBatchExportUrls';
import { useBatchMapExportJobs } from './batchMapExport/useBatchMapExportJobs';
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
  const { enqueueBatchMapExportJob } = useBatchMapExportJobs();

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
  /** Reseed batch defaults when layer or batch toggle changes; avoid clobbering after user edits same layer. */
  const batchDateRangeSeededForLayerRef = useRef<string | null>(null);
  /** Tracks print dialog open/close so we seed preview bounds/zoom once per open from main map. */
  const printDialogWasOpenRef = useRef(false);

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
    if (!toggles.batchMapsVisibility) {
      batchDateRangeSeededForLayerRef.current = null;
    }
  }, [toggles.batchMapsVisibility]);

  useEffect(() => {
    if (!open) {
      batchDateRangeSeededForLayerRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setPreviewBounds(null);
      setPreviewZoom(null);
      setPreviewMapWidth(null);
      setPreviewMapHeight(null);
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      printDialogWasOpenRef.current = false;
      return;
    }
    if (!selectedMap || printDialogWasOpenRef.current) {
      return;
    }
    setPreviewBounds(selectedMap.getBounds());
    setPreviewZoom(selectedMap.getZoom());
    printDialogWasOpenRef.current = true;
  }, [open, selectedMap]);

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

  useEffect(() => {
    if (
      !open ||
      !toggles.batchMapsVisibility ||
      !printSelectedLayer ||
      batchDateRangeSeededForLayerRef.current === printSelectedLayer.id
    ) {
      return;
    }
    const dateItems = getPossibleDatesForLayer(
      printSelectedLayer,
      availableDates,
    );
    if (dateItems.length === 0) {
      return;
    }
    const mapStart = dateRange.startDate;
    const fromMap =
      mapStart != null
        ? dateItems.find(
            item =>
              dateWithoutTime(item.queryDate) === dateWithoutTime(mapStart) ||
              dateWithoutTime(item.displayDate) === dateWithoutTime(mapStart),
          )
        : undefined;
    const anchorItem = fromMap ?? dateItems[dateItems.length - 1];
    const day = dateWithoutTime(anchorItem.displayDate);
    setDateRangeForBatchMaps({ startDate: day, endDate: day });
    batchDateRangeSeededForLayerRef.current = printSelectedLayer.id;
  }, [
    open,
    toggles.batchMapsVisibility,
    printSelectedLayer,
    availableDates,
    dateRange.startDate,
  ]);

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

  const shouldEnableBatchMaps = true;

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

    const rangeStartDay = dateWithoutTime(startDate);
    const rangeEndDay = dateWithoutTime(endDate);

    const displayDayByQuery = new Map(
      dateItems.map(item => [item.queryDate, item.displayDate]),
    );

    const rawUniqueDates = [...new Set(dateItems.map(item => item.queryDate))]
      .filter(d => {
        const disp = displayDayByQuery.get(d);
        if (disp === undefined) {
          return false;
        }
        const day = dateWithoutTime(disp);
        return day >= rangeStartDay && day <= rangeEndDay;
      })
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
    setDownloadMenuAnchorEl(null);
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
      if (!printSelectedLayer) {
        console.error('No layer selected for batch download');
        return;
      }

      const formattedDates = filteredBatchDates
        .map(timestamp => getFormattedDate(timestamp, 'default'))
        .filter((d): d is string => d !== undefined && d !== '');

      if (formattedDates.length === 0) {
        console.error('No dates found in the selected range');
        return;
      }

      const mapBounds = previewBounds;
      const mapZoom = previewZoom;
      const pageUrl = new URL(window.location.href);
      const { pathname, search } = pageUrl;
      const origin = getMapExportPageOrigin(pageUrl);
      const exportPath = `${pathname.replace(/\/$/, '')}/export`;
      const baseParams = new URLSearchParams(search);

      const exportDims = calculateExportDimensions(
        mapDimensions.aspectRatio,
        mapDimensions.aspectRatio === 'Auto'
          ? (previewMapWidth ?? undefined)
          : undefined,
        mapDimensions.aspectRatio === 'Auto'
          ? (previewMapHeight ?? undefined)
          : undefined,
      );

      const constructedUrls = buildBatchExportUrls({
        formattedDates,
        origin,
        exportPath,
        baseSearchParams: baseParams,
        printSelectedLayer,
        mapBounds,
        mapZoom,
        mapDimensions,
        titleText,
        footerText,
        footerTextSize,
        logoPosition,
        logoScale,
        legendPosition,
        legendScale,
        bottomLogoScale,
        toggles,
        selectedBoundaries,
      });

      const layerDisplayName =
        printSelectedLayer.title ?? printSelectedLayer.id;
      const datesSummary = buildBatchExportDatesDisplay(filteredBatchDates);
      const { downloadFilename } = buildBatchArtifactBasenames(
        country,
        printSelectedLayer.id,
        filteredBatchDates,
        format,
      );

      enqueueBatchMapExportJob({
        urls: constructedUrls,
        viewportWidth: exportDims.canvasWidth,
        viewportHeight: exportDims.canvasHeight,
        format,
        layerDisplayName,
        datesSummary,
        downloadFilename,
        mapTotal: constructedUrls.length,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? t('Batch export failed: {{message}}', { message: error.message })
          : t(
              'Something went wrong with the batch download. Please try again.',
            );
      dispatch(
        addNotification({
          type: 'error',
          message,
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
        <DialogContent>
          <Box className={classes.contentContainer}>
            <PrintPreview />
            <PrintConfig />
          </Box>
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
