/* eslint-disable fp/no-mutation */
import React, { ChangeEvent, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
import { renderToStaticMarkup } from 'react-dom/server';
import LegendList from 'components/MapView/Legends/LegendList';
import {
  layerDataSelector,
  layersSelector,
  mapSelector,
  loadingLayerIdsSelector,
  dateRangeSelector,
  layersDataSelector,
} from 'context/mapStateSlice/selectors';
import { useSafeTranslation } from 'i18n';
import { downloadToFile } from 'components/MapView/utils';
import { layerOrdering } from 'context/mapStateSlice';
import { getBoundaryLayerSingleton } from 'config/utils';
import { BoundaryLayerProps } from 'config/types';
import { LayerData } from 'context/layers/layer-data';
import { Extent } from 'components/MapView/Layers/raster-utils';
import bbox from '@turf/bbox';
import {
  analysisResultOpacitySelector,
  analysisResultSelector,
  isAnalysisLayerActiveSelector,
  isExposureAnalysisLoadingSelector,
} from 'context/analysisResultStateSlice';
import { loadingLayerIdsSelector as tileLoadingLayerIdsSelector } from 'context/mapTileLoadingStateSlice';
import { useUrlHistory } from 'utils/url-utils';

const Footer = () => (
  <div
    style={{
      width: '100%',
      height: '75px',
      paddingTop: '15px',
      fontSize: '12px',
    }}
  >
    <strong>
      Layers represent data on --date--. Sources WFP, UNGIWG, OCHA, GAUL, USGS,
      NASA, UCSB
    </strong>
    <br />
    The designations employed and the presentation of material in the map(s) do
    not imply the expression of any opinion on the part of WFP concerning the
    legal of constitutional status of any country, teritory, city, or sea, or
    concerning the delimitation of its frontiersor boundaries.
  </div>
);

function addReactElemToCanvas(
  context: CanvasRenderingContext2D,
  reactComponent: React.JSX.Element,
  dx: number,
  dy: number,
) {
  const elem = document.createElement('div');

  const staticElem = renderToStaticMarkup(reactComponent);

  elem.innerHTML = staticElem;

  document.body.appendChild(elem);

  elem.style.position = 'absolute';
  elem.style.left = '0';
  elem.style.top = '0';

  html2canvas(elem)
    .then(c => {
      context.drawImage(c, dx, dy);
    })
    .catch(err => console.error('html2canvas error:', err));

  document.body.removeChild(elem);
}

function DownloadImage({ classes, open, handleClose }: DownloadImageProps) {
  const { t } = useSafeTranslation();
  const { removeLayerFromUrl } = useUrlHistory();

  const dispatch = useDispatch();

  const isAnalysisLayerActive = useSelector(isAnalysisLayerActiveSelector);
  const analysisResult = useSelector(analysisResultSelector);
  const analysisLayerOpacity = useSelector(analysisResultOpacitySelector);

  const tileLayerIds = useSelector(tileLoadingLayerIdsSelector);
  const vectorLayerIds = useSelector(loadingLayerIdsSelector);

  const isAnalysisExposureLoading = useSelector(
    isExposureAnalysisLoadingSelector,
  );
  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const layersData = useSelector(layersDataSelector);

  const boundaryLayer = React.useMemo(() => {
    return getBoundaryLayerSingleton();
  }, []);

  const boundaryLayerId = React.useMemo(() => {
    return boundaryLayer.id;
  }, [boundaryLayer.id]);

  const unsortedSelectedLayers = useSelector(layersSelector);
  const selectedMap = useSelector(mapSelector);
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayerId)) as
    | LayerData<BoundaryLayerProps>
    | undefined;

  const previewRef = useRef<HTMLCanvasElement>(null);
  // list of toggles
  const [toggles, setToggles] = React.useState({
    legend: true,
    footer: true,
  });
  const [downloading, setDownloading] = React.useState<boolean>(false);

  const adminBoundariesExtent = React.useMemo(() => {
    if (!boundaryLayerData) {
      return undefined;
    }
    return bbox(boundaryLayerData.data) as Extent; // we get extents of admin boundaries to give to the api.
  }, [boundaryLayerData]);

  // Prioritize boundary and point_data layers
  const selectedLayers = React.useMemo(() => {
    // eslint-disable-next-line fp/no-mutating-methods
    return [...unsortedSelectedLayers].sort(layerOrdering);
  }, [unsortedSelectedLayers]);

  if (selectedMap) {
    const activeLayers = selectedMap.getCanvas();
    const canvas = previewRef.current;
    if (canvas) {
      canvas.setAttribute('width', activeLayers.width.toString());
      canvas.setAttribute('height', activeLayers.height.toString());
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(activeLayers, 0, 0);

        if (toggles.legend) {
          addReactElemToCanvas(
            context as CanvasRenderingContext2D,
            <div>
              <LegendList
                layers={selectedLayers}
                extent={adminBoundariesExtent}
                isAnalysisLayerActive={isAnalysisLayerActive}
                analysisResult={analysisResult}
                analysisLayerOpacity={analysisLayerOpacity}
                dispatch={dispatch}
                map={selectedMap}
                selectedLayers={selectedLayers}
                tileLayerIds={tileLayerIds}
                vectorLayerIds={vectorLayerIds}
                isAnalysisExposureLoading={isAnalysisExposureLoading}
                selectedDate={selectedDate}
                adminLevelLayersData={layersData}
                removeLayerFromUrl={removeLayerFromUrl}
                renderButtons={false}
              />
            </div>,
            24,
            24,
          );
        }

        if (toggles.footer) {
          addReactElemToCanvas(
            context,
            <Footer />,
            0,
            activeLayers.height - 90,
          );
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
              <FormControlLabel
                control={
                  <Switch
                    checked={toggles.legend}
                    onChange={toggle}
                    name="legend"
                    color="primary"
                  />
                }
                label={<Typography variant="h4">{t('Legend')}</Typography>}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={toggles.footer}
                    onChange={toggle}
                    name="footer"
                    color="primary"
                  />
                }
                label={<Typography variant="h4">{t('Footer text')}</Typography>}
                className={classes.gutter}
              />
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
