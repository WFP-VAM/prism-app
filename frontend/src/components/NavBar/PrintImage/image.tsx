import React, { ChangeEvent, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  CircularProgress,
  createStyles,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  Switch,
  Theme,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { mapSelector } from '../../../context/mapStateSlice/selectors';
import { useSafeTranslation } from '../../../i18n';
import { downloadToFile } from '../../MapView/utils';

function DownloadImage({ classes, open, handleClose }: DownloadImageProps) {
  const { t } = useSafeTranslation();
  const selectedMap = useSelector(mapSelector);
  const previewRef = useRef<HTMLCanvasElement>(null);
  // list of toggles
  const [toggles, setToggles] = React.useState({
    legend: true,
    footer: true,
    fullLayerDescription: true,
    scaleBar: true,
  });
  const [downloading, setDownloading] = React.useState<boolean>(false);

  if (open && selectedMap) {
    const activeLayers = selectedMap.getCanvas();
    selectedMap.addControl(new mapboxgl.ScaleControl(), 'top-right');
    const canvas = previewRef.current;
    if (canvas) {
      canvas.setAttribute('width', activeLayers.width.toString());
      canvas.setAttribute('height', activeLayers.height.toString());
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(activeLayers, 0, 0);
        // toggle legend
        const div = document.getElementById('legend-list');
        if (div?.firstChild && toggles.legend) {
          const childElements = Array.prototype.filter.call(
            div.childNodes,
            // eslint-disable-next-line func-names
            function (node) {
              return node.nodeType === 1; // Node type 1 represents an HTMLElement
            },
          );

          const target = document.createElement('div');
          // eslint-disable-next-line fp/no-mutation
          target.style.width = '180px';

          childElements.forEach((li: HTMLElement) => {
            const children = Array.prototype.filter.call(
              li.childNodes,
              // eslint-disable-next-line func-names
              function (node) {
                return node.nodeType === 1; // Node type 1 represents an HTMLElement
              },
            ) as HTMLElement[];
            const divContainer = children[0] as HTMLElement;

            const contents = Array.prototype.filter.call(
              divContainer.childNodes,
              // eslint-disable-next-line func-names
              function (node) {
                return node.nodeType === 1; // Node type 1 represents an HTMLElement
              },
            ) as HTMLElement[];

            const container = document.createElement('div');
            // eslint-disable-next-line fp/no-mutation
            container.style.padding = '8px';
            // eslint-disable-next-line fp/no-mutation
            container.style.paddingBottom = '16px';
            target.appendChild(container);
            contents
              .slice(0, toggles.fullLayerDescription ? 6 : 4)
              .forEach(x => container.appendChild(x.cloneNode(true)));
          });

          document.body.appendChild(target);

          html2canvas(target)
            .then(c => {
              context.drawImage(c, 24, 24);
            })
            .finally(() => document.body.removeChild(target));
        }

        if (toggles.scaleBar) {
          const elem = document.querySelector('.maplibregl-ctrl-scale');

          if (elem) {
            const html = document.createElement('div');
            html.appendChild(elem);

            document.body.appendChild(html);
            html2canvas(html)
              .then(c => {
                context.drawImage(
                  c,
                  activeLayers.width - 85,
                  activeLayers.height - 105,
                );
              })
              .finally(() => document.body.removeChild(html));
          }
        }

        // toggle footer
        if (toggles.footer) {
          const footer = document.createElement('div');
          // eslint-disable-next-line
          footer.innerHTML = `
            <div style='width:100%;height:75px;padding-top:15px;font-size:12px'>
              <strong>
                Layers represent data on --date--. Sources WFP, UNGIWG, OCHA, GAUL, USGS, NASA, UCSB
              </strong>
              <br>
              The designations employed and the presentation of material in the map(s)
              do not imply the expression of any opinion on the part of WFP concerning
              the legal of constitutional status of any country, teritory, city, or sea,
              or concerning the delimitation of its frontiersor boundaries.
            </div>
          `;
          document.body.appendChild(footer);
          html2canvas(footer)
            .then(c => {
              context.drawImage(c, 0, activeLayers.height - 90);
            })
            .finally(() => document.body.removeChild(footer));
        }
      }
    }
  }

  const toggle = (event: ChangeEvent<HTMLInputElement>) => {
    setToggles(prevValues => {
      return { ...prevValues, [event.target.name]: event.target.checked };
    });
  };

  const download = async (format: 'pdf' | 'jpeg' | 'png') => {
    const docGeneration = new Promise<void>((resolve, reject) => {
      // png is generally preferred for images containing lines and text.
      const ext = format === 'pdf' ? 'png' : format;
      const canvas = previewRef.current;
      if (!canvas) {
        reject(new Error('canvas is undefined'));
        // return statement to make compiler happy about canvas possibly being undefined
        return;
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
      resolve();
    });

    setDownloading(true);
    try {
      await docGeneration;
    } catch (error) {
      console.error(error);
    } finally {
      setDownloading(false);
    }

    handleClose();
  };

  const options = [
    { checked: toggles.legend, name: 'legend', label: 'Legend' },
    { checked: toggles.footer, name: 'footer', label: 'Footer Text' },
    {
      checked: toggles.fullLayerDescription,
      name: 'fullLayerDescription',
      label: 'Full Layer Description',
    },
    { checked: toggles.scaleBar, name: 'scaleBar', label: 'Scale Bar' },
  ];

  return (
    <Dialog
      maxWidth="xl"
      open={open}
      keepMounted
      onClose={() => handleClose()}
      aria-labelledby="dialog-preview"
    >
      <DialogTitle className={classes.title} id="dialog-preview">
        {t('Map Preview')}
      </DialogTitle>
      <DialogContent>
        <Grid container>
          <Grid item xs={10}>
            <canvas ref={previewRef} className={classes.canvas} />
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
                <FormControlLabel
                  key={option.name}
                  control={
                    <Switch
                      checked={option.checked}
                      onChange={toggle}
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
                onClick={() => download('png')}
                color="primary"
                className={classes.gutter}
              >
                {t('Download PNG')}
              </Button>
              <Button
                variant="contained"
                onClick={() => download('jpeg')}
                color="primary"
                className={classes.gutter}
              >
                {t('Download JPEG')}
              </Button>
              <Button
                variant="contained"
                onClick={() => download('pdf')}
                color="primary"
                className={classes.gutter}
              >
                {downloading ? (
                  <CircularProgress color="secondary" />
                ) : (
                  t('Download PDF')
                )}
              </Button>
              <Button onClick={() => handleClose()} color="primary">
                {t('Cancel')}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
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
  });

export interface DownloadImageProps extends WithStyles<typeof styles> {
  open: boolean;
  handleClose: () => void;
}

export default withStyles(styles)(DownloadImage);
