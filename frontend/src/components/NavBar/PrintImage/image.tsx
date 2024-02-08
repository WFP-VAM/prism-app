import {
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Slider,
  Switch,
  TextField,
  Theme,
  Typography,
  WithStyles,
  createStyles,
  makeStyles,
  withStyles,
} from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import EditIcon from '@material-ui/icons/Edit';
import GetAppIcon from '@material-ui/icons/GetApp';
import { legendListId } from 'components/MapView/Legends';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import maplibregl from 'maplibre-gl';
import moment from 'moment';
import React, { ChangeEvent, useRef } from 'react';
import MapGL, { MapRef } from 'react-map-gl/maplibre';
import { useSelector } from 'react-redux';

import { mapStyle } from 'components/MapView/Map';
import { addFillPatternImagesInMap } from 'components/MapView/Layers/AdminLevelDataLayer';

import useLayers from 'utils/layers-utils';
import { AdminLevelDataLayerProps } from 'config/types';
import {
  dateRangeSelector,
  mapSelector,
} from '../../../context/mapStateSlice/selectors';
import { useSafeTranslation } from '../../../i18n';
import { downloadToFile } from '../../MapView/utils';

const DEFAULT_FOOTER_TEXT =
  'The designations employed and the presentation of material in the map(s) do not imply the expression of any opinion on the part of WFP concerning the legal of constitutional status of any country, territory, city, or sea, or concerning the delimitation of its frontiers or boundaries.';

const useEditTextDialogPropsStyles = makeStyles((theme: Theme) => ({
  title: {
    color: theme.palette.text.secondary,
  },
}));

interface EditTextDialogProps {
  open: boolean;
  footerText: string;
  onCancel: () => void;
  onOk: (value: string) => void;
}

function EditTextDialog({
  open,
  footerText,
  onCancel,
  onOk,
}: EditTextDialogProps) {
  const classes = useEditTextDialogPropsStyles();
  const { t } = useSafeTranslation();

  const [value, setValue] = React.useState('');

  React.useEffect(() => {
    setValue(footerText);
  }, [open, footerText]);

  return (
    <Dialog maxWidth="xl" open={open} onClose={() => onCancel()}>
      <DialogTitle className={classes.title}>
        {t('Edit Footer Text')}
      </DialogTitle>
      <DialogContent style={{ width: '40rem' }}>
        <TextField
          fullWidth
          inputProps={{ style: { color: 'black' } }}
          multiline
          maxRows={4}
          value={value}
          onChange={e => {
            setValue(e.target.value);
          }}
          variant="outlined"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onCancel()} color="secondary">
          {t('Cancel')}
        </Button>
        <Button onClick={() => onOk(value)} color="primary">
          {t('Ok')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DownloadImage({ classes, open, handleClose }: DownloadImageProps) {
  const { t, i18n } = useSafeTranslation();
  const selectedMap = useSelector(mapSelector);
  const dateRange = useSelector(dateRangeSelector);
  const printRef = useRef<HTMLDivElement>(null);
  const overlayContainerRef = useRef<HTMLDivElement>(null);

  const mapRef = React.useRef<MapRef>(null);
  // list of toggles
  const [toggles, setToggles] = React.useState({
    legend: true,
    footer: true,
    fullLayerDescription: true,
    scaleBar: true,
    northArrow: true,
  });
  const [
    downloadMenuAnchorEl,
    setDownloadMenuAnchorEl,
  ] = React.useState<HTMLElement | null>(null);
  const [openFooterEdit, setOpenFooterEdit] = React.useState(false);
  const [footerText, setFooterText] = React.useState('');
  const [elementsLoading, setElementsLoading] = React.useState(true);
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

  const createFooterElement = (
    inputFooterText: string = t(DEFAULT_FOOTER_TEXT),
    width: number,
    ratio: number,
  ): HTMLDivElement => {
    const footer = document.createElement('div');
    // eslint-disable-next-line fp/no-mutation
    footer.innerHTML = `
      <div style='width:${
        (width - 16) / ratio
      }px;margin:8px;font-size:12px;padding-bottom:8px;'>
        ${inputFooterText}
      </div>
    `;
    return footer;
  };

  const refreshImage = async () => {
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
        if (div?.firstChild && toggles.legend) {
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
        if (toggles.footer) {
          const footer = createFooterElement(
            footerText,
            activeLayers.width,
            ratio,
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
                (30 + (toggles.footer ? footerTextHeight : 0)) * ratio,
              html.offsetWidth * ratio,
              html.offsetHeight * ratio,
            );
            document.body.removeChild(html);
          }
        }

        if (toggles.northArrow) {
          const image = new Image();
          const imageWidth = 40 * ratio;
          const imageHeight = 60 * ratio;

          image.onload = () => {
            context.drawImage(
              image,
              activeLayers.width -
                (scaleBarGap + imageWidth / 2 + scalerBarLength / 2) * ratio,
              activeLayers.height -
                (110 + (toggles.footer ? footerTextHeight : 0)) * ratio,
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

  React.useEffect(() => {
    if (open) {
      setElementsLoading(true);
    }
  }, [open]);

  React.useEffect(() => {
    if (open) {
      refreshImage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, footerText, toggles, legendScale]);

  const toggle = (event: ChangeEvent<HTMLInputElement>) => {
    setToggles(prevValues => {
      return { ...prevValues, [event.target.name]: event.target.checked };
    });
  };

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

  const options = [
    { checked: toggles.legend, name: 'legend', label: 'Legend' },
    {
      checked: toggles.fullLayerDescription,
      name: 'fullLayerDescription',
      label: 'Full Layer Description',
    },
    {
      checked: toggles.footer,
      name: 'footer',
      label: 'Footer Text',
      button: { Icon: EditIcon, onClick: () => setOpenFooterEdit(true) },
    },
    // Hide options for toggling scale bar and north arrow
    // { checked: toggles.scaleBar, name: 'scaleBar', label: 'Scale Bar' },
    // { checked: toggles.northArrow, name: 'northArrow', label: 'North Arrow' },
  ];

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
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {t('Map Preview')}
            <Typography color="textSecondary" variant="body1">
              {t('Use your mouse to pan and zoom the map')}
            </Typography>
          </div>

          <IconButton
            className={classes.closeButton}
            onClick={() => handleClose()}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent style={{ scrollbarGutter: 'stable' }}>
          <Grid container>
            <Grid
              item
              xs={10}
              style={{
                width: '70vw',
                height: '80vh',
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
                        onLoad={e => {
                          e.target.setCenter(selectedMap.getCenter());
                          e.target.setZoom(selectedMap.getZoom());
                        }}
                        onIdle={() => {
                          refreshImage();
                        }}
                        minZoom={selectedMap.getMinZoom()}
                        maxZoom={selectedMap.getMaxZoom()}
                        mapStyle={selectedMapStyle || mapStyle.toString()}
                        maxBounds={selectedMap.getMaxBounds() ?? undefined}
                      />
                    )}
                  </div>
                </div>
              </div>
            </Grid>

            <Grid item xs>
              <Box display="flex" flexDirection="column" pl={5}>
                <Box
                  fontSize={14}
                  fontWeight={500}
                  mb={1}
                  className={classes.title}
                >
                  {t('Map Options')}
                </Box>
                {options.map(option => (
                  <div key={option.label} className={classes.toggleWrapper}>
                    <FormControlLabel
                      key={option.name}
                      control={
                        <Switch
                          checked={option.checked}
                          onChange={e => {
                            toggle(e);
                          }}
                          name={option.name}
                          color="primary"
                        />
                      }
                      label={
                        <Typography variant="h4">{t(option.label)}</Typography>
                      }
                    />
                    {option.button && (
                      <IconButton onClick={option.button.onClick}>
                        <option.button.Icon />
                      </IconButton>
                    )}
                  </div>
                ))}
                <Typography color="textSecondary" variant="h4" gutterBottom>
                  {t('Total width')}
                </Typography>
                <Slider
                  defaultValue={100}
                  step={10}
                  marks
                  min={50}
                  max={100}
                  value={mapDimensions.width}
                  onChange={(e, val) =>
                    setMapDimensions(prev => ({
                      ...(prev || {}),
                      width: val as number,
                    }))
                  }
                />

                <Typography color="textSecondary" variant="h4" gutterBottom>
                  {t('Legend scale')}
                </Typography>
                <Slider
                  defaultValue={100}
                  marks
                  step={10}
                  min={50}
                  max={100}
                  value={legendScale}
                  onChange={(e, val) => setLegendScale(val as number)}
                />

                <Button
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

      <EditTextDialog
        open={openFooterEdit}
        footerText={footerText}
        onCancel={() => setOpenFooterEdit(false)}
        onOk={(val: string) => {
          setOpenFooterEdit(false);
          setFooterText(val);
        }}
      />
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
