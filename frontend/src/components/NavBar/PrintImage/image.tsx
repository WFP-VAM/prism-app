import {
  Box,
  Button,
  Dialog,
  DialogContent,
  Icon,
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
import { GetApp, Cancel, Visibility, VisibilityOff } from '@material-ui/icons';
import mask from '@turf/mask';
import html2canvas from 'html2canvas';
import { debounce, get } from 'lodash';
import { jsPDF } from 'jspdf';
import maplibregl from 'maplibre-gl';
import React, { useRef, useState } from 'react';
import MapGL, { Layer, MapRef, Marker, Source } from 'react-map-gl/maplibre';
import { useSelector } from 'react-redux';
import { mapStyle } from 'components/MapView/Map';
import { getFormattedDate } from 'utils/date-utils';
import { appConfig, safeCountry } from 'config';
import { AdminCodeString, BoundaryLayerProps } from 'config/types';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import ToggleButton from '@material-ui/lab/ToggleButton';
import { cyanBlue, lightGrey } from 'muiTheme';
import { AAMarkersSelector } from 'context/anticipatoryActionStateSlice';
import { useAAMarkerScalePercent } from 'utils/map-utils';
import { SimpleBoundaryDropdown } from 'components/MapView/Layers/BoundaryDropdown';
import { getBoundaryLayerSingleton } from 'config/utils';
import { LayerData } from 'context/layers/layer-data';
import LegendItemsList from 'components/MapView/Legends/LegendItemsList';
import useResizeObserver from 'utils/useOnResizeObserver';
import { Panel, leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import {
  dateRangeSelector,
  layerDataSelector,
  mapSelector,
} from '../../../context/mapStateSlice/selectors';
import { useSafeTranslation } from '../../../i18n';
import { downloadToFile } from '../../MapView/utils';

const defaultFooterText = get(appConfig, 'printConfig.defaultFooterText', '');

// Debounce changes so that we don't redraw on every keystroke.
const debounceCallback = debounce((callback: any, ...args: any[]) => {
  callback(...args);
}, 750);

interface ToggleSelectorProps {
  title: string;
  value: number;
  options: {
    value: number;
    comp:
      | React.JSX.Element
      | (({ value }: { value: number }) => React.JSX.Element);
    disabled?: boolean;
  }[];
  iconProp?: number;
  align?: 'start' | 'end';
  setValue: (v: number) => void;
}

const toggleSelectorStyles = makeStyles(() => ({
  wrapper: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  buttonGroup: { display: 'flex', gap: '0.3rem' },
  button: {
    height: '2.5rem',
    width: '3rem',
    borderLeft: '1px solid rgba(0, 0, 0, 0.12) !important',
  },
}));

function ToggleSelector({
  title,
  options,
  value,
  iconProp,
  align,
  setValue,
}: ToggleSelectorProps) {
  const classes = toggleSelectorStyles();
  return (
    <div className={classes.wrapper}>
      <Typography variant="h4" style={{ textAlign: align }}>
        {title}
      </Typography>
      <ToggleButtonGroup
        value={value}
        exclusive
        className={classes.buttonGroup}
        style={{ justifyContent: align }}
      >
        {options.map(x => (
          <ToggleButton
            key={x.value}
            className={classes.button}
            value={x.value}
            onClick={() => setValue(x.value)}
            disabled={x.disabled}
          >
            {typeof x.comp === 'function' ? (
              <x.comp value={Number(iconProp)} />
            ) : (
              x.comp
            )}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
}

const legendScaleSelectorOptions = [
  { value: 0.5, comp: <div>50%</div> },
  { value: 0.4, comp: <div>60%</div> },
  { value: 0.3, comp: <div>70%</div> },
  { value: 0.2, comp: <div>80%</div> },
  { value: 0.1, comp: <div>90%</div> },
  { value: 0, comp: <div>100%</div> },
];

const legendPositionOptions = [
  { value: -1, comp: <VisibilityOff /> },
  {
    value: 0,
    comp: ({ value }: { value: number }) => (
      <Icon style={{ color: 'black' }}>
        {value % 2 === 0 ? 'switch_left' : 'switch_right'}
      </Icon>
    ),
  },
];

const mapWidthSelectorOptions = [
  { value: 50, comp: <div>50%</div> },
  { value: 60, comp: <div>60%</div> },
  { value: 70, comp: <div>70%</div> },
  { value: 80, comp: <div>80%</div> },
  { value: 90, comp: <div>90%</div> },
  { value: 100, comp: <div>100%</div> },
];

const footerTextSelectorOptions = [
  { value: 0, comp: <VisibilityOff /> },
  { value: 8, comp: <div style={{ fontSize: '8px' }}>Aa</div> },
  { value: 10, comp: <div style={{ fontSize: '10px' }}>Aa</div> },
  { value: 12, comp: <div style={{ fontSize: '12px' }}>Aa</div> },
  { value: 16, comp: <div style={{ fontSize: '16px' }}>Aa</div> },
  { value: 20, comp: <div style={{ fontSize: '20px' }}>Aa</div> },
];

const layerDescriptionSelectorOptions = [
  { value: 0, comp: <VisibilityOff /> },
  { value: 1, comp: <Visibility /> },
];

const countryMaskSelectorOptions = [
  { value: 1, comp: <VisibilityOff /> },
  { value: 0, comp: <Visibility /> },
];

const mapLabelsVisibilityOptions = [
  { value: 0, comp: <VisibilityOff /> },
  { value: 1, comp: <Visibility /> },
];

const boundaryLayer = getBoundaryLayerSingleton();

function DownloadImage({ classes, open, handleClose }: DownloadImageProps) {
  const { t } = useSafeTranslation();
  const { country } = appConfig;
  const selectedMap = useSelector(mapSelector);
  const dateRange = useSelector(dateRangeSelector);
  const AAMarkers = useSelector(AAMarkersSelector);
  const tabValue = useSelector(leftPanelTabValueSelector);
  const printRef = useRef<HTMLDivElement>(null);
  const northArrowRef = useRef<HTMLImageElement>(null);
  const boundaryLayerState = useSelector(
    layerDataSelector(boundaryLayer.id),
  ) as LayerData<BoundaryLayerProps> | undefined;
  const { data } = boundaryLayerState || {};

  const mapRef = React.useRef<MapRef>(null);
  // list of toggles
  const [toggles, setToggles] = React.useState({
    fullLayerDescription: true,
    countryMask: false,
    mapLabelsVisibility: true,
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
  // the % value of the original dimensions
  const [mapDimensions, setMapDimensions] = React.useState<{
    height: number;
    width: number;
  }>({ width: 100, height: 100 });
  const [legendWidth, setLegendWidth] = React.useState(0);
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

  const updateScaleBarAndNorthArrow = React.useCallback(() => {
    const elem = document.querySelector(
      '.maplibregl-ctrl-scale',
    ) as HTMLElement;

    // this takes into account the watermark
    const baseHeight = footerHeight || 20;

    if (elem) {
      // eslint-disable-next-line fp/no-mutating-assign
      Object.assign(elem.style, {
        position: 'absolute',
        right: '10px',
        bottom: `${baseHeight + 10}px`,
        margin: 0,
      });
    }

    if (northArrowRef.current) {
      northArrowRef.current.style.bottom = `${baseHeight + 40}px`;
    }
  }, [footerHeight]);

  React.useEffect(() => {
    updateScaleBarAndNorthArrow();
  }, [updateScaleBarAndNorthArrow]);

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

  const scalePercent = useAAMarkerScalePercent(mapRef.current?.getMap());
  const dateText = `${t('Publication date: ')}${getFormattedDate(
    new Date(),
    'default',
  )}. ${t('Layer selection date: ')}${getFormattedDate(
    dateRange.startDate,
    'default',
  )}.`;

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
          <div className={classes.previewContainer}>
            <div>
              <Typography variant="h3" className={classes.title}>
                {t('MAP PREVIEW')}
              </Typography>
              <Typography color="textSecondary" variant="body1">
                {t('Use your mouse to pan and zoom the map')}
              </Typography>
            </div>
            <div
              style={{
                width: '100%',
                height: '100%',
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
                  <img
                    ref={northArrowRef}
                    style={{
                      position: 'absolute',
                      zIndex: 3,
                      width: '50px',
                      bottom: `${footerHeight + 40}px`,
                      right: '10px',
                    }}
                    src="./images/icon_north_arrow.png"
                    alt="northArrow"
                  />
                  {titleText && (
                    <div ref={titleRef} className={classes.titleOverlay}>
                      {titleText}
                    </div>
                  )}
                  {footerTextSize > 0 && footerText && (
                    <div
                      ref={footerRef}
                      className={classes.footerOverlay}
                      style={{
                        fontSize: `${footerTextSize}px`,
                      }}
                    >
                      <div style={{ padding: '8px' }}>{footerText}</div>
                    </div>
                  )}
                  {dateText && (
                    <div
                      className={classes.dateFooterOverlay}
                      style={{
                        fontSize: `${footerTextSize}px`,
                      }}
                    >
                      <div style={{ padding: '8px' }}>{dateText}</div>
                    </div>
                  )}
                  {legendPosition !== -1 && (
                    <div
                      style={{
                        position: 'absolute',
                        zIndex: 2,
                        top: titleHeight,
                        ...(legendPosition % 2 === 0
                          ? { left: '8px' }
                          : {
                              right: `${legendWidth - 8}px`,
                            }),
                        width: '20px',
                        // Use transform scale to adjust size based on legendScale
                        transform: `scale(${1 - legendScale})`,
                      }}
                    >
                      <LegendItemsList
                        resizeCallback={({ width }) => setLegendWidth(width)}
                        forPrinting
                        listStyle={classes.legendListStyle}
                        showDescription={toggles.fullLayerDescription}
                      />
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
                        onLoad={e => {
                          e.target.addControl(
                            new maplibregl.ScaleControl({}),
                            'bottom-right',
                          );
                          updateScaleBarAndNorthArrow();
                        }}
                        mapStyle={selectedMapStyle || mapStyle.toString()}
                        maxBounds={selectedMap.getMaxBounds() ?? undefined}
                      >
                        {tabValue === Panel.AnticipatoryAction &&
                          AAMarkers.map(marker => (
                            <Marker
                              key={`marker-${marker.district}`}
                              longitude={marker.longitude}
                              latitude={marker.latitude}
                              anchor="center"
                            >
                              <div
                                style={{ transform: `scale(${scalePercent})` }}
                              >
                                {marker.icon}
                              </div>
                            </Marker>
                          ))}
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
            </div>
          </div>

          <div className={classes.optionsContainer}>
            <div>
              <Box
                fontSize={14}
                fontWeight={900}
                mb={1}
                className={classes.title}
              >
                {t('Map Options')}
              </Box>
              <IconButton
                className={classes.closeButton}
                onClick={() => handleClose()}
              >
                <Cancel />
              </IconButton>
            </div>

            <div className={classes.optionWrap}>
              <Typography variant="h4">{t('Title')}</Typography>
              <TextField
                defaultValue={country}
                fullWidth
                size="small"
                inputProps={{ style: { color: 'black' } }}
                onChange={event => {
                  debounceCallback(setTitleText, event.target.value);
                }}
                variant="outlined"
              />
            </div>

            <div className={classes.sameRowToggles}>
              <ToggleSelector
                value={Number(toggles.countryMask)}
                options={countryMaskSelectorOptions}
                setValue={val =>
                  setToggles(prev => ({
                    ...prev,
                    countryMask: Boolean(val),
                  }))
                }
                title={t('Admin area mask')}
              />

              <ToggleSelector
                value={Number(toggles.mapLabelsVisibility)}
                options={mapLabelsVisibilityOptions}
                setValue={val =>
                  setToggles(prev => ({
                    ...prev,
                    mapLabelsVisibility: Boolean(val),
                  }))
                }
                align="end"
                title={t('Map Labels')}
              />
            </div>

            {toggles.countryMask && (
              <div className={classes.optionWrap}>
                <Typography variant="h4">{t('Select admin area')}</Typography>
                <SimpleBoundaryDropdown
                  selectAll
                  className={classes.formControl}
                  selectedBoundaries={selectedBoundaries}
                  setSelectedBoundaries={setSelectedBoundaries}
                  selectProps={{
                    variant: 'outlined',
                    fullWidth: true,
                  }}
                  multiple={false}
                  size="small"
                />
              </div>
            )}

            <div className={classes.sameRowToggles}>
              <ToggleSelector
                value={legendPosition > -1 ? 0 : -1}
                options={legendPositionOptions}
                iconProp={legendPosition}
                setValue={v =>
                  setLegendPosition(prev => (v === -1 ? -1 : prev + 1))
                }
                title={t('Legend Position')}
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
                align="end"
                title={t('Full Layer Description')}
              />
            </div>

            <div
              // disable the legend scale if the legend is not visible
              style={{
                opacity: legendPosition !== -1 ? 1 : 0.5,
                pointerEvents: legendPosition !== -1 ? 'auto' : 'none',
              }}
            >
              <ToggleSelector
                value={legendScale}
                options={legendScaleSelectorOptions}
                setValue={setLegendScale}
                title={t('Legend Size')}
              />
            </div>

            <ToggleSelector
              value={mapDimensions.width}
              options={mapWidthSelectorOptions}
              setValue={val =>
                setMapDimensions(prev => ({
                  ...(prev || {}),
                  width: val as number,
                }))
              }
              title={t('Map Width')}
            />

            <ToggleSelector
              value={footerTextSize}
              options={footerTextSelectorOptions}
              setValue={setFooterTextSize}
              title={t('Footer Text')}
            />

            <TextField
              size="small"
              key={defaultFooterText}
              multiline
              defaultValue={defaultFooterText}
              inputProps={{ style: { color: 'black', fontSize: '0.9rem' } }}
              minRows={3}
              maxRows={3}
              onChange={event => {
                debounceCallback(setFooterText, event.target.value);
              }}
              variant="outlined"
            />

            <Button
              style={{ backgroundColor: cyanBlue, color: 'black' }}
              variant="contained"
              color="primary"
              className={classes.gutter}
              endIcon={<GetApp />}
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
          </div>
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
    gutter: {
      marginBottom: 10,
    },
    closeButton: {
      position: 'absolute',
      right: theme.spacing(1),
      top: theme.spacing(1),
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
    optionWrap: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.6rem',
    },
    titleOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 2,
      color: 'black',
      backgroundColor: 'white',
      width: '100%',
      textAlign: 'center',
      fontSize: '1.5rem',
      padding: '8px 0 8px 0',
      borderBottom: `1px solid ${lightGrey}`,
    },
    dateFooterOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      zIndex: 2,
      display: 'flex',
      justifyContent: 'flex-start',
      color: 'black',
      backgroundColor: 'white',
      width: '100%',
    },
    footerOverlay: {
      position: 'absolute',
      bottom: 20, // leave room for the date text
      left: 0,
      zIndex: 3,
      color: 'black',
      backgroundColor: 'white',
      width: '100%',
      borderTop: `1px solid ${lightGrey}`,
    },
    formControl: {
      width: '100%',
      '& > .MuiInputLabel-shrink': { display: 'none' },
      '& > .MuiInput-root': { margin: 0 },
      '& label': {
        textTransform: 'uppercase',
        letterSpacing: '3px',
        fontSize: '11px',
        position: 'absolute',
        top: '-13px',
      },
    },
    contentContainer: {
      scrollbarGutter: 'stable',
      display: 'flex',
      gap: '1rem',
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '90vw',
      height: '90vh',
    },
    optionsContainer: {
      display: 'flex',
      height: '100%',
      flexDirection: 'column',
      gap: '0.8rem',
      width: '19.2rem',
      scrollbarGutter: 'stable',
      overflow: 'auto',
      paddingRight: '15px',
      zIndex: 4,
      backgroundColor: 'white',
    },
    legendListStyle: {
      position: 'absolute',
      top: '8px',
      zIndex: 2,
    },
    sameRowToggles: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    previewContainer: {
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
    },
  });

export interface DownloadImageProps extends WithStyles<typeof styles> {
  open: boolean;
  handleClose: () => void;
}

export default withStyles(styles)(DownloadImage);
