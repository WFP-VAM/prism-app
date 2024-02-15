import {
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Theme,
  Typography,
  WithStyles,
  createStyles,
  makeStyles,
  withStyles,
} from '@material-ui/core';
import GetAppIcon from '@material-ui/icons/GetApp';
import mask from '@turf/mask';
import { legendListId } from 'components/MapView/Legends';
import html2canvas from 'html2canvas';
import { debounce } from 'lodash';
import { jsPDF } from 'jspdf';
import maplibregl from 'maplibre-gl';
import moment from 'moment';
import React, { useRef, useState } from 'react';
import MapGL, { Layer, MapRef, Source } from 'react-map-gl/maplibre';
import { useSelector } from 'react-redux';
import CancelIcon from '@material-ui/icons/Cancel';
import { mapStyle } from 'components/MapView/Map';
import { addFillPatternImagesInMap } from 'components/MapView/Layers/AdminLevelDataLayer';
import useLayers from 'utils/layers-utils';
import { safeCountry } from 'config';
import { AdminLevelDataLayerProps } from 'config/types';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import ToggleButton from '@material-ui/lab/ToggleButton';
import VisibilityOffIcon from '@material-ui/icons/VisibilityOff';
import VisibilityIcon from '@material-ui/icons/Visibility';
import { cyanBlue } from 'muiTheme';
import {
  dateRangeSelector,
  mapSelector,
} from '../../../context/mapStateSlice/selectors';
import { useSafeTranslation } from '../../../i18n';
import { downloadToFile } from '../../MapView/utils';

const DEFAULT_FOOTER_TEXT =
  'The designations employed and the presentation of material in the map(s) do not imply the expression of any opinion on the part of WFP concerning the legal of constitutional status of any country, territory, city, or sea, or concerning the delimitation of its frontiers or boundaries.';

// Debounce the footer text changes so that we don't redraw on every keystroke.
const handleChangeFooterText = debounce(
  (onTextChange: any, newSearchText: string) => {
    onTextChange(newSearchText.length === 0 ? undefined : newSearchText);
  },
  750,
);

interface ToggleSelectorProps {
  title: string;
  value: number;
  options: { value: number; comp: React.JSX.Element; disabled?: boolean }[];
  setValue: (v: number) => void;
}

const toggleSelectorStyles = makeStyles(() => ({
  wrapper: { display: 'flex', flexDirection: 'column', gap: '0.8rem' },
  buttonGroup: { gap: '4px' },
  button: {
    height: '40px',
    width: '48px',
    borderLeft: '1px solid rgba(0, 0, 0, 0.12) !important',
  },
}));

function ToggleSelector({
  title,
  options,
  value,
  setValue,
}: ToggleSelectorProps) {
  const classes = toggleSelectorStyles();
  return (
    <div className={classes.wrapper}>
      <Typography variant="h4">{title}</Typography>
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(e, v) => setValue(v)}
        className={classes.buttonGroup}
      >
        {options.map(x => (
          <ToggleButton
            key={x.value}
            className={classes.button}
            value={x.value}
            disabled={x.disabled}
          >
            {x.comp}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
}

const legendSelectorOptions = [
  { value: 0, comp: <VisibilityOffIcon /> },
  { value: 60, comp: <div>60%</div> },
  { value: 70, comp: <div>70%</div> },
  { value: 80, comp: <div>80%</div> },
  { value: 90, comp: <div>90%</div> },
  { value: 100, comp: <div>100%</div> },
];

const mapWidthSelectorOptions = [
  { value: 0, comp: <VisibilityOffIcon />, disabled: true },
  { value: 60, comp: <div>60%</div> },
  { value: 70, comp: <div>70%</div> },
  { value: 80, comp: <div>80%</div> },
  { value: 90, comp: <div>90%</div> },
  { value: 100, comp: <div>100%</div> },
];

const footerTextSelectorOptions = [
  { value: 0, comp: <VisibilityOffIcon /> },
  { value: 8, comp: <div style={{ fontSize: '8px' }}>Aa</div> },
  { value: 10, comp: <div style={{ fontSize: '10px' }}>Aa</div> },
  { value: 12, comp: <div style={{ fontSize: '12px' }}>Aa</div> },
  { value: 16, comp: <div style={{ fontSize: '16px' }}>Aa</div> },
  { value: 20, comp: <div style={{ fontSize: '20px' }}>Aa</div> },
];

const layerDescriptionSelectorOptions = [
  { value: 0, comp: <VisibilityOffIcon /> },
  { value: 1, comp: <VisibilityIcon /> },
];

const countryMaskSelectorOptions = [
  { value: 0, comp: <VisibilityOffIcon /> },
  { value: 1, comp: <VisibilityIcon /> },
];

function DownloadImage({ classes, open, handleClose }: DownloadImageProps) {
  const { t, i18n } = useSafeTranslation();
  const selectedMap = useSelector(mapSelector);
  const dateRange = useSelector(dateRangeSelector);
  const printRef = useRef<HTMLDivElement>(null);
  const overlayContainerRef = useRef<HTMLDivElement>(null);

  const mapRef = React.useRef<MapRef>(null);
  // list of toggles
  const [toggles, setToggles] = React.useState({
    fullLayerDescription: true,
    countryMask: true,
    scaleBar: true,
    northArrow: true,
  });
  const [
    downloadMenuAnchorEl,
    setDownloadMenuAnchorEl,
  ] = React.useState<HTMLElement | null>(null);
  const [footerText, setFooterText] = React.useState('');
  const [elementsLoading, setElementsLoading] = React.useState(true);
  const [footerTextSize, setFooterTextSize] = React.useState(12);
  const [legendScale, setLegendScale] = React.useState(100);
  // the % value of the original dimensions
  const [mapDimensions, setMapDimensions] = React.useState<{
    height: number;
    width: number;
  }>({ width: 100, height: 100 });

  // Get the style and layers of the old map
  const selectedMapStyle = selectedMap?.getStyle();

  const { selectedLayers } = useLayers();
  const adminLevelLayersWithFillPattern = selectedLayers.filter(
    layer => layer.type === 'admin_level_data' && layer.fillPattern,
  ) as AdminLevelDataLayerProps[];

  React.useEffect(() => {
    const getDateText = (): string => {
      if (!dateRange) {
        return '';
      }
      return `${t('Layers represent data')} ${
        dateRange.startDate && dateRange.endDate
          ? `${t('from')} ${moment(dateRange.startDate).format(
              'YYYY-MM-DD',
            )} ${t('to')} ${moment(dateRange.endDate).format('YYYY-MM-DD')}`
          : `${t('on')} ${moment(dateRange.startDate).format('YYYY-MM-DD')}`
      }. `;
    };
    setFooterText(`${getDateText()} ${t(DEFAULT_FOOTER_TEXT)}`);
  }, [i18n.language, t, dateRange]);

  const [invertedAdminBoundaryLimitPolygon, setAdminBoundaryPolygon] = useState(
    null,
  );

  React.useEffect(() => {
    // admin-boundary-unified-polygon.json is generated using "yarn preprocess-layers"
    // which runs ./scripts/preprocess-layers.js
    fetch(`data/${safeCountry}/admin-boundary-unified-polygon.json`)
      .then(response => response.json())
      .then(polygonData => {
        const maskedPolygon = mask(polygonData as any);
        setAdminBoundaryPolygon(maskedPolygon as any);
      })
      .catch(error => console.error('Error:', error));
  }, []);

  const createFooterElement = (
    inputFooterText: string = t(DEFAULT_FOOTER_TEXT),
    width: number,
    ratio: number,
    fontSize: number,
  ): HTMLDivElement => {
    const footer = document.createElement('div');
    // eslint-disable-next-line fp/no-mutation
    footer.innerHTML = `
      <div style='width:${
        (width - 16) / ratio
      }px;margin:8px;font-size:12px;padding-bottom:8px;font-size:${fontSize}px'>
        ${inputFooterText}
      </div>
    `;
    return footer;
  };

  const refreshImage = async (currentFooterText = footerText) => {
    /* eslint-disable fp/no-mutation */
    setElementsLoading(true);
    if (open && mapRef.current) {
      const map = mapRef.current.getMap();
      const activeLayers = map.getCanvas();
      // Load fill pattern images to this new map instance if needed.
      Promise.all(
        adminLevelLayersWithFillPattern.map(layer =>
          addFillPatternImagesInMap(layer as AdminLevelDataLayerProps, map),
        ),
      );

      const canvasContainer = overlayContainerRef.current;
      if (!canvasContainer) {
        return;
      }

      // clear canvas
      while (canvasContainer.firstChild) {
        canvasContainer.removeChild(canvasContainer.firstChild);
      }

      const canvas = document.createElement('canvas');
      if (canvas) {
        let footerTextHeight = 0;
        let scalerBarLength = 0;
        const scaleBarGap = 10;

        const { width } = activeLayers;
        const { height } = activeLayers;

        const ratio = window.devicePixelRatio || 1;

        canvas.width = width * ratio;
        canvas.height = height * ratio;
        canvas.style.width = `${width / ratio}px`;
        canvas.style.height = `${height / ratio}px`;

        const context = canvas.getContext('2d');

        if (!context) {
          return;
        }

        context.scale(ratio, ratio);
        context.clearRect(0, 0, canvas.width, canvas.height);

        // toggle legend
        const div = document.getElementById(legendListId);
        if (div?.firstChild && legendScale > 0) {
          const childElements = Array.from(div.childNodes).filter(
            node => node.nodeType === 1,
          ) as HTMLElement[];

          const target = document.createElement('div');
          target.style.width = '196px'; // 180px + 2*8px padding

          childElements.forEach((li: HTMLElement, i) => {
            const isLast = childElements.length - 1 === i;

            const children = Array.from(li.childNodes).filter(
              // node type 1 represents an HTMLElement
              node => node.nodeType === 1,
            ) as HTMLElement[];
            const divContainer = children[0] as HTMLElement;

            const contents = Array.from(divContainer.childNodes).filter(
              node => node.nodeType === 1,
            ) as HTMLElement[];

            const container = document.createElement('div');
            container.style.padding = '8px';
            container.style.paddingBottom = isLast ? '8px' : '16px';
            target.appendChild(container);

            const keepDivider = isLast ? 1 : 0;

            contents
              .slice(
                0,
                toggles.fullLayerDescription
                  ? 6 - keepDivider
                  : 4 - keepDivider,
              )
              .forEach(x => container.appendChild(x.cloneNode(true)));
          });

          document.body.appendChild(target);

          const c = await html2canvas(target, { useCORS: true });
          context.drawImage(
            c,
            24,
            24,
            (target.offsetWidth * legendScale * ratio) / 100.0,
            (target.offsetHeight * legendScale * ratio) / 100.0,
          );
          document.body.removeChild(target);
        }

        // toggle footer
        if (footerTextSize > 0) {
          const footer = createFooterElement(
            currentFooterText,
            activeLayers.width,
            ratio,
            footerTextSize,
          );
          document.body.appendChild(footer);
          const c = await html2canvas(footer);
          footerTextHeight = footer.offsetHeight;
          context.drawImage(
            c,
            0 * ratio,
            activeLayers.height - footer.offsetHeight * ratio,
            footer.offsetWidth * ratio,
            footer.offsetHeight * ratio,
          );
          document.body.removeChild(footer);
        }

        if (toggles.scaleBar) {
          map.addControl(new maplibregl.ScaleControl({}), 'top-right');
          const elem = document.querySelector(
            '.maplibregl-ctrl-scale',
          ) as HTMLElement;

          if (elem) {
            const html = document.createElement('div');

            scalerBarLength = elem.offsetWidth;
            html.style.width = `${elem.offsetWidth + 2}px`;
            html.appendChild(elem);

            document.body.appendChild(html);

            const c = await html2canvas(html);
            context.drawImage(
              c,
              activeLayers.width - (scaleBarGap + elem.offsetWidth) * ratio,
              activeLayers.height -
                (30 + (footerTextSize > 0 ? footerTextHeight : 0)) * ratio,
              html.offsetWidth * ratio,
              html.offsetHeight * ratio,
            );
            document.body.removeChild(html);
          }
        }

        if (toggles.northArrow) {
          const image = new Image();
          const imageWidth = 50 * ratio;
          const imageHeight = 60 * ratio;

          image.onload = () => {
            context.drawImage(
              image,
              activeLayers.width -
                (scaleBarGap + imageWidth / 4 + scalerBarLength / 2) * ratio,
              activeLayers.height -
                (110 + (footerTextSize > 0 ? footerTextHeight : 0)) * ratio,
              imageWidth,
              imageHeight,
            );
          };
          image.src = './images/icon_north_arrow.png';
        }

        canvasContainer.appendChild(canvas);
      }
    }
    /* eslint-enable fp/no-mutation */
    setElementsLoading(false);
  };

  // reload the canvas when the settings are changed
  React.useEffect(() => {
    if (open) {
      refreshImage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggles, legendScale, mapRef, footerTextSize]);

  const handleDownloadMenuClose = () => {
    setDownloadMenuAnchorEl(null);
  };

  const handleDownloadMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setDownloadMenuAnchorEl(event.currentTarget);
  };

  const download = (format: 'pdf' | 'jpeg' | 'png') => {
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
        // eslint-disable-next-line new-cap
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'px',
          format: [canvas.width, canvas.height],
        });
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const pdfWidth = pdf.internal.pageSize.getWidth();
        pdf.addImage(file, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        pdf.save('map.pdf');
      } else {
        downloadToFile({ content: file, isUrl: true }, 'map', `image/${ext}`);
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

  return (
    <>
      <Dialog
        maxWidth="xl"
        open={open}
        keepMounted
        onClose={() => handleClose()}
        aria-labelledby="dialog-preview"
      >
        <DialogTitle className={classes.title} id="dialog-preview">
          <Typography
            variant="h3"
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            {t('MAP PREVIEW')}
            <Typography color="textSecondary" variant="body1">
              {t('Use your mouse to pan and zoom the map')}
            </Typography>
          </Typography>

          <IconButton
            className={classes.closeButton}
            onClick={() => handleClose()}
          >
            <CancelIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent style={{ scrollbarGutter: 'stable' }}>
          <Grid container style={{ width: '90vw', height: '80vh' }}>
            <Grid
              item
              xs={9}
              style={{
                width: '100%',
                height: '100%',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  zIndex: 3,
                  border: '1px solid black',
                  height: `${mapDimensions.height}%`,
                  width: `${mapDimensions.width}%`,
                }}
              >
                <div ref={printRef} className={classes.printContainer}>
                  <div
                    ref={overlayContainerRef}
                    className={classes.mapOverlay}
                  />
                  {elementsLoading && (
                    <div className={classes.backdropWrapper}>
                      <Backdrop className={classes.backdrop} open>
                        <CircularProgress />
                      </Backdrop>
                    </div>
                  )}
                  <div className={classes.mapContainer}>
                    {selectedMap && open && (
                      <MapGL
                        ref={mapRef}
                        dragRotate={false}
                        // preserveDrawingBuffer is required for the map to be exported as an image
                        preserveDrawingBuffer
                        initialViewState={{
                          longitude: selectedMap.getCenter().lng,
                          latitude: selectedMap.getCenter().lat,
                          zoom: selectedMap.getZoom(),
                        }}
                        onLoad={() => refreshImage()}
                        onMoveEnd={() => refreshImage()}
                        mapStyle={selectedMapStyle || mapStyle.toString()}
                        maxBounds={selectedMap.getMaxBounds() ?? undefined}
                      >
                        {toggles.countryMask && (
                          <Source
                            id="mask-overlay"
                            type="geojson"
                            data={invertedAdminBoundaryLimitPolygon}
                          >
                            <Layer
                              id="mask-layer-overlay"
                              type="fill"
                              source="mask-overlay"
                              layout={{}}
                              paint={{
                                'fill-color': '#000',
                                'fill-opacity': 0.7,
                              }}
                            />
                          </Source>
                        )}
                      </MapGL>
                    )}
                  </div>
                </div>
              </div>
            </Grid>

            <Grid item xs={3}>
              <Box display="flex" flexDirection="column" pl={5} gridGap="1rem">
                <Box
                  fontSize={14}
                  fontWeight={700}
                  mb={1}
                  className={classes.title}
                >
                  {t('Map Options')}
                </Box>

                <ToggleSelector
                  value={Number(toggles.countryMask)}
                  options={countryMaskSelectorOptions}
                  setValue={val =>
                    setToggles(prev => ({
                      ...prev,
                      countryMask: Boolean(val),
                    }))
                  }
                  title="Mask data outside of admin area"
                />

                <ToggleSelector
                  value={Number(toggles.fullLayerDescription)}
                  options={layerDescriptionSelectorOptions}
                  setValue={val =>
                    setToggles(prev => ({
                      ...prev,
                      fullLayerDescription: Boolean(val),
                    }))
                  }
                  title="Full Layer Description"
                />

                <ToggleSelector
                  value={legendScale}
                  options={legendSelectorOptions}
                  setValue={setLegendScale}
                  title="Legend"
                />

                <ToggleSelector
                  value={mapDimensions.width}
                  options={mapWidthSelectorOptions}
                  setValue={val =>
                    setMapDimensions(prev => ({
                      ...(prev || {}),
                      width: val as number,
                    }))
                  }
                  title="Map Width"
                />

                <ToggleSelector
                  value={footerTextSize}
                  options={footerTextSelectorOptions}
                  setValue={setFooterTextSize}
                  title="Footer Text"
                />

                <TextField
                  multiline
                  value={footerText}
                  inputProps={{ style: { color: 'black' } }}
                  minRows={4}
                  onChange={event => {
                    setFooterText(event.target.value);
                    handleChangeFooterText(refreshImage, event.target.value);
                  }}
                  variant="outlined"
                />

                <Button
                  style={{ backgroundColor: cyanBlue, color: 'black' }}
                  variant="contained"
                  color="primary"
                  className={classes.gutter}
                  endIcon={<GetAppIcon />}
                  onClick={e => handleDownloadMenuOpen(e)}
                >
                  {t('Download')}
                </Button>
                <Menu
                  anchorEl={downloadMenuAnchorEl}
                  keepMounted
                  open={Boolean(downloadMenuAnchorEl)}
                  onClose={handleDownloadMenuClose}
                >
                  <MenuItem onClick={() => download('png')}>
                    {t('Download PNG')}
                  </MenuItem>
                  <MenuItem onClick={() => download('jpeg')}>
                    {t('Download JPEG')}
                  </MenuItem>
                  <MenuItem onClick={() => download('pdf')}>
                    {t('Download PDF')}
                  </MenuItem>
                </Menu>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
    </>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    title: {
      color: theme.palette.text.secondary,
    },
    canvas: {
      width: '100%',
    },
    gutter: {
      marginBottom: 10,
    },
    firstButton: {
      marginTop: 20,
      marginBottom: 10,
    },
    closeButton: {
      position: 'absolute',
      right: theme.spacing(1),
      top: theme.spacing(1),
      color: theme.palette.grey[500],
    },
    backdrop: {
      position: 'absolute',
    },
    backdropWrapper: {
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 2,
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
    },
    toggleWrapper: { display: 'flex', justifyContent: 'space-between' },
    printContainer: {
      width: '100%',
      height: '100%',
    },
    mapContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      width: '100%',
      zIndex: 1,
    },
    mapOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 2,
      pointerEvents: 'none',
    },
  });

export interface DownloadImageProps extends WithStyles<typeof styles> {
  open: boolean;
  handleClose: () => void;
}

export default withStyles(styles)(DownloadImage);
