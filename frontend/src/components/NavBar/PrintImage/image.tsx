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
import { debounce } from 'lodash';
import { jsPDF } from 'jspdf';
import maplibregl from 'maplibre-gl';
import React, { useRef, useState } from 'react';
import MapGL, { Layer, MapRef, Source } from 'react-map-gl/maplibre';
import { useSelector } from 'react-redux';
import { mapStyle } from 'components/MapView/Map';
import { getFormattedDate } from 'utils/date-utils';
import { appConfig, safeCountry } from 'config';
import { AdminCodeString, BoundaryLayerProps } from 'config/types';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import ToggleButton from '@material-ui/lab/ToggleButton';
import { cyanBlue, gray } from 'muiTheme';
import { SimpleBoundaryDropdown } from 'components/MapView/Layers/BoundaryDropdown';
import { getBoundaryLayerSingleton } from 'config/utils';
import { LayerData } from 'context/layers/layer-data';
import LegendItemsList from 'components/MapView/Legends/LegendItemsList';
import useResizeObserver from 'utils/useOnResizeObserver';
import {
  dateRangeSelector,
  layerDataSelector,
  mapSelector,
} from '../../../context/mapStateSlice/selectors';
import { useSafeTranslation } from '../../../i18n';
import { downloadToFile } from '../../MapView/utils';

const mapLabelLayers = [
  'label_airport',
  'label_place_other',
  'label_place_city',
  'label_country_other',
  'label_country',
];

const DEFAULT_FOOTER_TEXT =
  'The designations employed and the presentation of material in the map(s) do not imply the expression of any opinion on the part of WFP concerning the legal of constitutional status of any country, territory, city, or sea, or concerning the delimitation of its frontiers or boundaries.';

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
  setValue: (v: number) => void;
}

const toggleSelectorStyles = makeStyles(() => ({
  wrapper: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
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
  iconProp,
  setValue,
}: ToggleSelectorProps) {
  const classes = toggleSelectorStyles();
  return (
    <div className={classes.wrapper}>
      <Typography variant="h4">{title}</Typography>
      <ToggleButtonGroup
        value={value}
        exclusive
        className={classes.buttonGroup}
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
    scaleBar: true,
    northArrow: true,
  });
  const [
    downloadMenuAnchorEl,
    setDownloadMenuAnchorEl,
  ] = React.useState<HTMLElement | null>(null);
  const [selectedBoundaries, setSelectedBoundaries] = React.useState<
    AdminCodeString[]
  >([]);
  const [titleText, setTitleText] = React.useState<string>(country);
  const [footerText, setFooterText] = React.useState('');
  const [footerTextSize, setFooterTextSize] = React.useState(12);
  const [legendScale, setLegendScale] = React.useState(0);
  const [legendPosition, setLegendPosition] = React.useState(0);
  // the % value of the original dimensions
  const [mapDimensions, setMapDimensions] = React.useState<{
    height: number;
    width: number;
  }>({ width: 100, height: 100 });
  const [legendWidth, setLegendWidth] = React.useState(0);
  const [mapLabelsVisibility, setMapLabelsVisibility] = React.useState(1);
  const [footerRef, { height: footerHeight }] = useResizeObserver<
    HTMLDivElement
  >(footerText, open);
  const [titleRef, { height: titleHeight }] = useResizeObserver<HTMLDivElement>(
    titleText,
    open,
  );

  // Get the style and layers of the old map
  const selectedMapStyle = selectedMap?.getStyle();

  const defaultFooterText = React.useMemo(() => {
    const getDateText = (): string => {
      if (!dateRange || !dateRange.startDate) {
        return '';
      }
      return `${t('Layers represent data')} ${
        dateRange.startDate && dateRange.endDate
          ? `${t('from')} ${getFormattedDate(
              dateRange.startDate,
              'default',
            )} ${t('to')} ${getFormattedDate(dateRange.endDate, 'default')}`
          : `${t('on')} ${getFormattedDate(dateRange.startDate, 'default')}`
      }. `;
    };
    return `${getDateText()}${t(DEFAULT_FOOTER_TEXT)}`;
  }, [t, dateRange]);

  const updateScaleBarAndNorthArrow = React.useCallback(() => {
    const elem = document.querySelector(
      '.maplibregl-ctrl-scale',
    ) as HTMLElement;

    if (elem) {
      // eslint-disable-next-line fp/no-mutating-assign
      Object.assign(elem.style, {
        position: 'absolute',
        right: '10px',
        bottom: `${footerHeight + 10}px`,
        margin: 0,
      });
    }

    if (northArrowRef.current) {
      northArrowRef.current.style.bottom = `${footerHeight + 40}px`;
    }
  }, [footerHeight]);

  const updateMapLabelsVisibility = React.useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) {
      return;
    }

    mapLabelLayers.forEach(label => {
      map.setPaintProperty(label, 'text-opacity', mapLabelsVisibility);
      // eslint-disable-next-line no-underscore-dangle
      map.style._updateLayer(label as any);
    });
  }, [mapLabelsVisibility]);

  React.useEffect(() => {
    setFooterText(defaultFooterText);
  }, [defaultFooterText]);

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

  React.useEffect(() => {
    updateMapLabelsVisibility();
  }, [updateMapLabelsVisibility, toggles.countryMask, open]);

  React.useEffect(() => {
    updateScaleBarAndNorthArrow();
  }, [footerText, updateScaleBarAndNorthArrow]);

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
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
            }}
          >
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
                        resizeCallback={e =>
                          setLegendWidth(
                            e[0].target.getBoundingClientRect().width,
                          )
                        }
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

            <ToggleSelector
              value={Number(toggles.countryMask)}
              options={countryMaskSelectorOptions}
              setValue={val =>
                setToggles(prev => ({
                  ...prev,
                  countryMask: Boolean(val),
                }))
              }
              title={t('Mask data outside of admin area')}
            />

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

            <ToggleSelector
              value={mapLabelsVisibility}
              options={mapLabelsVisibilityOptions}
              setValue={val => {
                setMapLabelsVisibility(val);
              }}
              title={t('Map Labels')}
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
              title={t('Legend - Full Layer Description')}
            />

            <ToggleSelector
              value={legendPosition > -1 ? 0 : -1}
              options={legendPositionOptions}
              iconProp={legendPosition}
              setValue={v =>
                setLegendPosition(prev => (v === -1 ? -1 : prev + 1))
              }
              title={t('Legend Position')}
            />

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
      borderBottom: `1px solid ${gray}`,
    },
    footerOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      zIndex: 2,
      color: 'black',
      backgroundColor: 'white',
      width: '100%',
      borderTop: `1px solid ${gray}`,
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
      width: '25rem',
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
  });

export interface DownloadImageProps extends WithStyles<typeof styles> {
  open: boolean;
  handleClose: () => void;
}

export default withStyles(styles)(DownloadImage);
