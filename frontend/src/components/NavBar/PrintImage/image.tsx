import React, { ChangeEvent, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
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
  Switch,
  TextField,
  Theme,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import GetAppIcon from '@material-ui/icons/GetApp';
import { legendListId } from 'components/MapView/Legends';
import moment from 'moment';
import RefreshIcon from '@material-ui/icons/Refresh';
import EditIcon from '@material-ui/icons/Edit';
import CloseIcon from '@material-ui/icons/Close';
import {
  dateRangeSelector,
  mapSelector,
} from '../../../context/mapStateSlice/selectors';
import { useSafeTranslation } from '../../../i18n';
import { downloadToFile } from '../../MapView/utils';

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
  const [canRefresh, setCanRefresh] = React.useState(false);

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
  ): HTMLDivElement => {
    const footer = document.createElement('div');
    // eslint-disable-next-line fp/no-mutation
    footer.innerHTML = `
      <div style='width:100%;height:75px;padding:8px;font-size:12px'>
        ${inputFooterText}
      </div>
    `;
    return footer;
  };

  const refreshImage = async () => {
    if (open && selectedMap) {
      const activeLayers = selectedMap.getCanvas();

      const canvas = document.createElement('canvas');
      const canvasContainer = document.getElementById(canvasPreviewContainerId);

      if (!canvasContainer) {
        return;
      }

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

        canvas.setAttribute('width', activeLayers.width.toString());
        canvas.setAttribute('height', activeLayers.height.toString());
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

        offScreenContext.drawImage(activeLayers, 0, 0);

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
          selectedMap.addControl(new mapboxgl.ScaleControl(), 'top-right');
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
          const footer = createFooterElement(footerText);
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
    refreshImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, footerText]);

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
    { checked: toggles.footer, name: 'footer', label: 'Footer Text' },
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
          {t('Map Preview')}
          <IconButton
            className={classes.closeButton}
            onClick={() => handleClose()}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Grid container>
            <Grid item xs={10} id="canvas-preview-container" />
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
                  <FormControlLabel
                    key={option.name}
                    control={
                      <Switch
                        checked={option.checked}
                        onChange={e => {
                          toggle(e);
                          setCanRefresh(true);
                        }}
                        name={option.name}
                        color="primary"
                      />
                    }
                    label={
                      <Typography variant="h4">{t(option.label)}</Typography>
                    }
                  />
                ))}
                <Button
                  variant="contained"
                  color="primary"
                  className={classes.editFooterButton}
                  endIcon={<EditIcon />}
                  onClick={() => setOpenFooterEdit(true)}
                  disabled={!toggles.footer}
                >
                  {t('Edit Footer Text')}
                </Button>
                <Button
                  disabled={!canRefresh}
                  variant="contained"
                  color="primary"
                  className={classes.gutter}
                  endIcon={<RefreshIcon />}
                  onClick={() => {
                    setCanRefresh(false);
                    refreshImage();
                  }}
                >
                  {t('Refresh Image')}
                </Button>
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
    editFooterButton: {
      marginTop: 20,
      marginBottom: 10,
    },
    closeButton: {
      position: 'absolute',
      right: theme.spacing(1),
      top: theme.spacing(1),
      color: theme.palette.grey[500],
    },
  });

export interface DownloadImageProps extends WithStyles<typeof styles> {
  open: boolean;
  handleClose: () => void;
}

export default withStyles(styles)(DownloadImage);
