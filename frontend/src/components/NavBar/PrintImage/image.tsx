import {
  Dialog,
  DialogContent,
  WithStyles,
  createStyles,
  withStyles,
} from '@material-ui/core';
import mask from '@turf/mask';
import html2canvas from 'html2canvas';
import { debounce, get } from 'lodash';
import { jsPDF } from 'jspdf';
import React, { useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { getFormattedDate } from 'utils/date-utils';
import { appConfig, safeCountry } from 'config';
import { AdminCodeString, BoundaryLayerProps } from 'config/types';
import { getBoundaryLayerSingleton } from 'config/utils';
import { LayerData } from 'context/layers/layer-data';
import useResizeObserver from 'utils/useOnResizeObserver';
import {
  dateRangeSelector,
  layerDataSelector,
  mapSelector,
} from '../../../context/mapStateSlice/selectors';
import { downloadToFile } from '../../MapView/utils';
import DownloadFormUI from './form';
import { MapDimensions, Toggles } from './printImage.types';
import ImagePreview from './preview';

const defaultFooterText = get(appConfig, 'printConfig.defaultFooterText', '');

// Debounce changes so that we don't redraw on every keystroke.
const debounceCallback = debounce((callback: any, ...args: any[]) => {
  callback(...args);
}, 750);

const boundaryLayer = getBoundaryLayerSingleton();

function DownloadImage({ classes, open, handleClose }: DownloadImageProps) {
  const { country } = appConfig;
  const selectedMap = useSelector(mapSelector);
  const dateRange = useSelector(dateRangeSelector);
  const printRef = useRef<HTMLDivElement>(null);
  const boundaryLayerState = useSelector(
    layerDataSelector(boundaryLayer.id),
  ) as LayerData<BoundaryLayerProps> | undefined;
  const { data } = boundaryLayerState || {};

  // list of toggles
  const [toggles, setToggles] = React.useState<Toggles>({
    fullLayerDescription: true,
    countryMask: false,
    mapLabelsVisibility: true,
    logoVisibility: true,
    legendVisibility: true,
  });

  const [
    downloadMenuAnchorEl,
    setDownloadMenuAnchorEl,
  ] = React.useState<HTMLElement | null>(null);
  const [selectedBoundaries, setSelectedBoundaries] = React.useState<
    AdminCodeString[]
  >([]);
  const [titleText, setTitleText] = React.useState<string>(country);
  const [footerText, setFooterText] = React.useState(defaultFooterText);
  const [footerTextSize, setFooterTextSize] = React.useState(12);
  const [legendScale, setLegendScale] = React.useState(0);
  const [legendPosition, setLegendPosition] = React.useState(0);
  const [logoPosition, setLogoPosition] = React.useState(-1);
  const [logoScale, setLogoScale] = React.useState(1);
  // the % value of the original dimensions
  const [mapDimensions, setMapDimensions] = React.useState<MapDimensions>({
    width: 100,
    height: 100,
  });
  const [footerRef, { height: footerHeight }] = useResizeObserver<
    HTMLDivElement
  >(footerText, open);
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

  const [invertedAdminBoundaryLimitPolygon, setAdminBoundaryPolygon] = useState(
    null,
  );

  React.useEffect(() => {
    // admin-boundary-unified-polygon.json is generated using "yarn preprocess-layers"
    // which runs ./scripts/preprocess-layers.js
    if (selectedBoundaries.length === 0) {
      fetch(`data/${safeCountry}/admin-boundary-unified-polygon.json`)
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

  const { logo } = appConfig.header || {};

  return (
    <>
      <Dialog
        maxWidth="xl"
        open={open}
        keepMounted
        onClose={() => handleClose()}
        aria-labelledby="dialog-preview"
      >
        <DialogContent className={classes.contentContainer}>
          <ImagePreview
            open={open}
            toggles={toggles}
            mapDimensions={mapDimensions}
            footerHeight={footerHeight}
            selectedBoundaries={selectedBoundaries}
            setDownloadMenuAnchorEl={setDownloadMenuAnchorEl}
            titleText={titleText}
            titleRef={titleRef}
            footerTextSize={footerTextSize}
            footerText={footerText}
            footerRef={footerRef}
            logoPosition={logoPosition}
            titleHeight={titleHeight}
            logoScale={logoScale}
            legendPosition={legendPosition}
            legendScale={legendScale}
            invertedAdminBoundaryLimitPolygon={
              invertedAdminBoundaryLimitPolygon
            }
          />
          <DownloadFormUI
            handleClose={handleClose}
            setTitleText={setTitleText}
            debounceCallback={debounceCallback}
            country={country}
            mapDimensions={mapDimensions}
            setMapDimensions={setMapDimensions}
            logo={logo}
            logoPosition={logoPosition}
            setLogoPosition={setLogoPosition}
            logoScale={logoScale}
            setLogoScale={setLogoScale}
            toggles={toggles}
            setToggles={setToggles}
            legendPosition={legendPosition}
            setLegendPosition={setLegendPosition}
            setFooterText={setFooterText}
            footerTextSize={footerTextSize}
            setFooterTextSize={setFooterTextSize}
            handleDownloadMenuOpen={handleDownloadMenuOpen}
            downloadMenuAnchorEl={downloadMenuAnchorEl}
            handleDownloadMenuClose={handleDownloadMenuClose}
            download={download}
            defaultFooterText={defaultFooterText}
            selectedBoundaries={selectedBoundaries}
            setSelectedBoundaries={setSelectedBoundaries}
            legendScale={legendScale}
            setLegendScale={setLegendScale}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

const styles = () =>
  createStyles({
    contentContainer: {
      fontFamily: 'Roboto',
      scrollbarGutter: 'stable',
      display: 'flex',
      gap: '1rem',
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '90vw',
      height: '90vh',
    },
  });

export interface DownloadImageProps extends WithStyles<typeof styles> {
  open: boolean;
  handleClose: () => void;
}

export default withStyles(styles)(DownloadImage);
