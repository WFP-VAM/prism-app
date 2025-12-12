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
import React, { useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { getFormattedDate } from 'utils/date-utils';
import { appConfig, safeCountry } from 'config';
import { AdminCodeString } from 'config/types';
import { getBoundaryLayerSingleton } from 'config/utils';
import useResizeObserver from 'utils/useOnResizeObserver';
import { useBoundaryData } from 'utils/useBoundaryData';
import {
  dateRangeSelector,
  mapSelector,
} from '../../../context/mapStateSlice/selectors';
import { downloadToFile } from '../../MapView/utils';
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
  const [legendScale, setLegendScale] = React.useState(0);
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
    selectedMapStyle.layers = selectedMapStyle?.layers.filter(
      x => !x.id.includes('label'),
    );
  }

  const [invertedAdminBoundaryLimitPolygon, setAdminBoundaryPolygon] =
    useState(null);

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
      defaultFooterText,
      setSelectedBoundaries,
      setLegendScale,
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
      scrollbarGutter: 'stable',
      display: 'flex',
      gap: '1rem',
      // Adjust for the printConfig scroll bar
      marginRight: '-15px',
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
