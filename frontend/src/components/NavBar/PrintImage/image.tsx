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
import React, { useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
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

const defaultFooterText = get(appConfig, 'printConfig.defaultFooterText', '');

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

  // list of toggles
  const [toggles, setToggles] = React.useState<Toggles>({
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
    React.useState<HTMLElement | null>(null);
  const [selectedBoundaries, setSelectedBoundaries] = React.useState<
    AdminCodeString[]
  >([]);
  const [titleText, setTitleText] = React.useState<string>(country);
  const [footerText, setFooterText] = React.useState(defaultFooterText);
  const [footerTextSize, setFooterTextSize] = React.useState(12);
  const [legendScale, setLegendScale] = React.useState(1);
  const [legendPosition, setLegendPosition] = React.useState(0);
  const [logoPosition, setLogoPosition] = React.useState(0);
  const [logoScale, setLogoScale] = React.useState(1);
  const [bottomLogoScale, setBottomLogoScale] = React.useState(1);
  // the % value of the original dimensions
  const [mapDimensions, setMapDimensions] = React.useState<MapDimensions>({
    width: 100,
    height: 100,
  });
  const [footerRef, { height: footerHeight }] =
    useResizeObserver<HTMLDivElement>(footerText, open);
  const [titleRef, { height: titleHeight }] = useResizeObserver<HTMLDivElement>(
    titleText,
    open,
  );

  // Get the style and layers of the old map
  const selectedMapStyle = selectedMap?.getStyle();

  if (selectedMapStyle && !toggles.mapLabelsVisibility) {
    // eslint-disable-next-line fp/no-mutation
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
  const shouldEnableBatchMaps = selectedLayersWithDateSupport.length > 0;

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

  React.useEffect(() => {
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
        // eslint-disable-next-line new-cap
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

      // Construct URLs for each date by updating the date query parameter
      const baseUrl = new URL(window.location.href);
      const constructedUrls = formattedDates
        .filter((date): date is string => date !== undefined)
        .map(date => {
          const urlWithDate = new URL(baseUrl);
          urlWithDate.searchParams.set('date', date);
          return urlWithDate.toString();
        });

      const response = await fetch(`${EXPORT_API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: constructedUrls,
          // TODO: Adjust to dynamic aspect ratio based on config
          aspectRatio: '3:4',
          format,
        }),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      // TODO: De-duplicate file-naming logic (probably better to do it on the frontend)
      const startDateStr = getFormattedDate(startDate, 'snake');
      const endDateStr = getFormattedDate(endDate, 'snake');
      const filename = `${titleText || country}_${startDateStr}_to_${endDateStr}`;
      // Server returns ZIP file when format is 'png'
      const contentType =
        format === 'pdf' ? 'application/pdf' : 'application/zip';

      downloadToFile(
        { content: downloadUrl, isUrl: true },
        filename,
        contentType,
      );

      handleClose();
      handleDownloadMenuClose();
    } catch (error) {
      console.error('Batch download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  // eslint-disable-next-line react/jsx-no-constructed-context-values
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
    },
  }),
);

export interface DownloadImageProps {
  open: boolean;
  handleClose: () => void;
}

export default DownloadImage;
