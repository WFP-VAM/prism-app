import React, { ChangeEvent, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useSelector } from 'react-redux';
import {
  Backdrop,
  Box,
  Button,
  CircularProgress,
  createStyles,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  makeStyles,
  Menu,
  MenuItem,
  Slider,
  Switch,
  TextField,
  Theme,
  Tooltip,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import GetAppIcon from '@material-ui/icons/GetApp';
import { legendListId } from 'components/MapView/Legends';
import moment from 'moment';
import EditIcon from '@material-ui/icons/Edit';
import CloseIcon from '@material-ui/icons/Close';
import { mapStyle } from 'components/MapView/Map';
import MapGL, { Layer, MapRef } from 'react-map-gl/maplibre';
import ControlCameraIcon from '@material-ui/icons/ControlCamera';
import DoneIcon from '@material-ui/icons/Done';
import {
  dateRangeSelector,
  mapSelector,
} from '../../../context/mapStateSlice/selectors';
import { useSafeTranslation } from '../../../i18n';
import { downloadToFile } from '../../MapView/utils';

const defaultMapWidth = 75;

const DEFAULT_FOOTER_TEXT =
  'The designations employed and the presentation of material in the map(s) do not imply the expression of any opinion on the part of WFP concerning the legal of constitutional status of any country, territory, city, or sea, or concerning the delimitation of its frontiers or boundaries.';

const canvasPreviewContainerId = 'canvas-preview-container';

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

  const previewRef = useRef<HTMLCanvasElement | null>(null);
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
  const [mapInteract, setMapInteract] = React.useState(true);
  const [mapLoading, setMapLoading] = React.useState(true);
  // the % value of the original dimensions
  const [mapDimensions, setMapDimensions] = React.useState<{
    height: number;
    width: number;
  }>({ width: 100, height: 100 });

  // Get the style and layers of the old map
  const selectedMapStyle = selectedMap?.getStyle();
  const selectedMapLayers = selectedMap?.getStyle()?.layers;

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
  ): HTMLDivElement => {
    const footer = document.createElement('div');
    // eslint-disable-next-line fp/no-mutation
    footer.innerHTML = `
      <div style='width:${width - 16}px;height:75px;margin:8px;font-size:12px'>
        ${inputFooterText}
      </div>
    `;
    return footer;
  };

  const refreshImage = async () => {
    if (open && mapRef.current) {
      const map = mapRef.current.getMap();
      const activeLayers = map.getCanvas();

      const canvas = document.createElement('canvas');
      const canvasContainer = document.getElementById(canvasPreviewContainerId);
      if (!canvasContainer) {
        return;
      }

      // clear canvas
      while (canvasContainer.firstChild) {
        canvasContainer.removeChild(canvasContainer.firstChild);
      }

      // eslint-disable-next-line fp/no-mutation
      canvas.style.width = '100%';

      // we add this here so the modal is not shrinking and expanding it's width, each time we update the settings
      canvasContainer.appendChild(canvas);
      previewRef.current = canvas;

      if (canvas) {
        const footerTextHeight = 90;
        let scalerBarLength = 0;
        const scaleBarGap = 10;

        canvas.setAttribute('width', `${activeLayers.width}px`);
        canvas.setAttribute('height', `${activeLayers.height}px`);
        canvas.setAttribute('style', '');
        const context = canvas.getContext('2d');

        // in chrome canvas does not draw as expected if it is already in dom
        const offScreenCanvas = document.createElement('canvas');
        const offScreenContext = offScreenCanvas.getContext('2d');

        // eslint-disable-next-line fp/no-mutation
        offScreenCanvas.width = activeLayers.width;
        // eslint-disable-next-line fp/no-mutation
        offScreenCanvas.height = activeLayers.height;

        if (!offScreenContext || !context) {
          return;
        }

        context.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the map
        if (!mapInteract) {
          offScreenContext.drawImage(activeLayers, 0, 0);
        }

        // toggle legend
        const div = document.getElementById(legendListId);
        if (div?.firstChild && toggles.legend) {
          const childElements = Array.from(div.childNodes).filter(
            node => node.nodeType === 1,
          ) as HTMLElement[];

          const target = document.createElement('div');
          // eslint-disable-next-line fp/no-mutation
          target.style.width = '180px';

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
            // eslint-disable-next-line fp/no-mutation
            container.style.padding = '8px';
            // eslint-disable-next-line fp/no-mutation
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

          const c = await html2canvas(target);
          offScreenContext.drawImage(c, 24, 24);
          document.body.removeChild(target);
        }

        if (toggles.scaleBar) {
          map.addControl(new maplibregl.ScaleControl({}), 'top-right');
          const elem = document.querySelector(
            '.maplibregl-ctrl-scale',
          ) as HTMLElement;

          if (elem) {
            const html = document.createElement('div');

            // eslint-disable-next-line fp/no-mutation
            scalerBarLength = elem.offsetWidth;

            // eslint-disable-next-line fp/no-mutation
            html.style.width = `${elem.offsetWidth + 2}px`;

            html.appendChild(elem);

            document.body.appendChild(html);

            const c = await html2canvas(html);
            offScreenContext.drawImage(
              c,
              activeLayers.width - (scaleBarGap + elem.offsetWidth),
              activeLayers.height -
                30 -
                (toggles.footer ? footerTextHeight : 0),
            );
            document.body.removeChild(html);
          }
        }

        // toggle footer
        if (toggles.footer) {
          const footer = createFooterElement(footerText, activeLayers.width);
          document.body.appendChild(footer);
          const c = await html2canvas(footer);
          offScreenContext.drawImage(
            c,
            0,
            activeLayers.height - footerTextHeight,
          );
          document.body.removeChild(footer);
        }

        if (toggles.northArrow) {
          const image = new Image();
          const imageWidth = 40;
          const imageHeight = 60;
          // eslint-disable-next-line fp/no-mutation
          image.onload = () => {
            offScreenContext.drawImage(
              image,
              activeLayers.width -
                scaleBarGap -
                imageWidth / 2 -
                scalerBarLength / 2,
              activeLayers.height -
                110 -
                (toggles.footer ? footerTextHeight : 0),
              imageWidth,
              imageHeight,
            );
            context.drawImage(offScreenCanvas, 0, 0);
          };
          // eslint-disable-next-line fp/no-mutation
          image.src = './images/icon_north_arrow.png';
        }

        context.drawImage(offScreenCanvas, 0, 0);
      }
    }
  };

  React.useEffect(() => {
    if (open) {
      setMapLoading(true);
    }
  }, [open]);

  React.useEffect(() => {
    if (open) {
      refreshImage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, footerText, toggles, mapInteract]);

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
    const docGeneration = () => {
      // png is generally preferred for images containing lines and text.
      const ext = format === 'pdf' ? 'png' : format;
      const canvas = previewRef.current;
      if (!canvas) {
        throw new Error('canvas is undefined');
      }
      const file = canvas.toDataURL(`image/${ext}`);
      if (format === 'pdf') {
        // eslint-disable-next-line new-cap
        const pdf = new jsPDF({
          orientation: 'landscape',
        });
        const imgProps = pdf.getImageProperties(file);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(file, 'PNG', 0, 0, pdfWidth, pdfHeight);
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
              {t(
                'Align the map using the mouse. Press confirm and verify everything looks correct before downloading.',
              )}
            </Typography>
          </div>

          <IconButton
            className={classes.closeButton}
            onClick={() => handleClose()}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Grid container>
            <Grid
              item
              xs={10}
              style={{
                width: `${defaultMapWidth}rem`,
                height: `${defaultMapWidth / 1.6}rem`,
                // match the border bellow
                border: '8px solid transparent',
                marginBottom: '16px',
                position: 'relative',
              }}
            >
              <div
                id={canvasPreviewContainerId}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 2,
                  pointerEvents: mapInteract ? 'none' : 'inherit',
                  // match the border bellow
                  border: '8px solid transparent',
                }}
              />
              {mapLoading && (
                <div
                  className={classes.backdropWrapper}
                  style={{
                    height: `${mapDimensions.height}%`,
                    width: `${mapDimensions.width}%`,
                  }}
                >
                  <Backdrop className={classes.backdrop} open={mapLoading}>
                    <CircularProgress />
                  </Backdrop>
                </div>
              )}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: `${mapDimensions.height}%`,
                  width: `${mapDimensions.width}%`,
                  zIndex: 1,
                  border: '8px solid red',
                }}
              >
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
                      setMapLoading(false);
                      refreshImage();
                    }}
                    minZoom={selectedMap.getMinZoom()}
                    maxZoom={selectedMap.getMaxZoom()}
                    mapStyle={(selectedMapStyle as any) || mapStyle.toString()}
                    maxBounds={selectedMap.getMaxBounds() ?? undefined}
                  >
                    {selectedMapLayers?.map(layer => (
                      <Layer key={layer.id} {...layer} />
                    ))}
                  </MapGL>
                )}
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
                  <div className={classes.toggleWrapper}>
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
                <Button
                  variant="contained"
                  color="primary"
                  className={classes.firstButton}
                  endIcon={mapInteract ? <DoneIcon /> : <ControlCameraIcon />}
                  onClick={() => setMapInteract(prev => !prev)}
                >
                  {mapInteract ? t('Confirm') : t('Edit Map')}
                </Button>
                {mapInteract && (
                  <>
                    <Typography color="textSecondary" variant="h4" gutterBottom>
                      {t('width')}
                    </Typography>
                    <Slider
                      defaultValue={100}
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
                  </>
                )}
                <Tooltip
                  title={
                    mapInteract
                      ? (t('Confirm before downloading') as string)
                      : ''
                  }
                >
                  <Button
                    disabled={mapInteract}
                    variant="contained"
                    color="primary"
                    className={classes.gutter}
                    endIcon={<GetAppIcon />}
                    onClick={e => handleDownloadMenuOpen(e)}
                  >
                    {t('Download')}
                  </Button>
                </Tooltip>
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
      margin: '8px',
    },
    toggleWrapper: { display: 'flex', justifyContent: 'space-between' },
  });

export interface DownloadImageProps extends WithStyles<typeof styles> {
  open: boolean;
  handleClose: () => void;
}

export default withStyles(styles)(DownloadImage);
