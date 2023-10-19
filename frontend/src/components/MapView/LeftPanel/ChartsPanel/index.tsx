import {
  Box,
  Button,
  Checkbox,
  createStyles,
  FormControl,
  FormControlLabel,
  FormGroup,
  Input,
  InputLabel,
  ListItemText,
  makeStyles,
  MenuItem,
  MenuProps,
  Select,
  Switch,
  Typography,
} from '@material-ui/core';
import { GeoJsonProperties } from 'geojson';
import { groupBy, mapKeys, snakeCase } from 'lodash';
import React, {
  memo,
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSelector } from 'react-redux';
import { TFunctionKeys } from 'i18next';
import { appConfig } from 'config';
import { BoundaryLayerProps, PanelSize, WMSLayerProps } from 'config/types';
import {
  getBoundaryLayersByAdminLevel,
  getWMSLayersWithChart,
} from 'config/utils';
import { LayerData } from 'context/layers/layer-data';
import { leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import { useSafeTranslation } from 'i18n';
import { castObjectsArrayToCsv } from 'utils/csv-utils';
import { downloadToFile } from 'components/MapView/utils';
import ChartSection from './ChartSection';
import LocationSelector from './LocationSelector';
import TimePeriodSelector from './TimePeriodSelector';

// Load boundary layer for Admin2
// WARNING - Make sure the dataviz_ids are available in the boundary file for Admin2
const MAX_ADMIN_LEVEL = appConfig.multiCountry ? 3 : 2;
const boundaryLayer = getBoundaryLayersByAdminLevel(MAX_ADMIN_LEVEL);

const chartLayers = getWMSLayersWithChart();

const tabIndex = 1;

function getProperties(
  layerData: LayerData<BoundaryLayerProps>['data'],
  id?: string,
) {
  // Return any properties, used for national level data.
  if (id === undefined) {
    return layerData.features[0].properties;
  }
  return layerData.features.filter(
    elem => elem.properties && elem.properties[boundaryLayer.adminCode] === id,
  )[0].properties;
}

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      display: 'flex',
      flexDirection: 'row',
      width: '100%',
      height: '100%',
    },
    formGroup: {
      marginBottom: 20,
    },
    chartsPanelParams: {
      marginTop: 30,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: PanelSize.medium,
      flexShrink: 0,
    },
    layerFormControl: {
      marginTop: 30,
      minWidth: '300px',
      maxWidth: '350px',
      '& .MuiFormLabel-root': {
        color: 'black',
      },
      '& .MuiSelect-root': {
        color: 'black',
      },
    },
    textLabel: {
      color: 'black',
    },
    chartsPanelCharts: {
      overflowY: 'auto',
      overflowX: 'hidden',
      display: 'flex',
      justifyContent: 'center',
      flexWrap: 'wrap',
      flexGrow: 4,
      gap: '16px',
      padding: '16px',
      marginTop: 0,
      paddingBottom: '1em',
    },
    downloadButton: {
      backgroundColor: '#62B2BD',
      '&:hover': {
        backgroundColor: '#62B2BD',
      },
      marginTop: '2em',
      marginLeft: '25%',
      marginRight: '25%',
      width: '50%',
      '&.Mui-disabled': { opacity: 0.5 },
    },
    clearAllSelectionsButton: {
      backgroundColor: '#788489',
      '&:hover': {
        backgroundColor: '#788489',
      },
      marginTop: 10,
      marginBottom: 10,
      marginLeft: '25%',
      marginRight: '25%',
      width: '50%',
      '&.Mui-disabled': { opacity: 0.5 },
    },
    switch: {
      marginRight: 2,
    },
    switchTrack: {
      backgroundColor: '#E0E0E0',
    },
    switchBase: {
      color: '#E0E0E0',
      '&.Mui-checked': {
        color: '#53888F',
      },
      '&.Mui-checked + .MuiSwitch-track': {
        backgroundColor: '#B1D6DB',
      },
    },
    switchTitle: {
      lineHeight: 1.8,
      color: 'black',
      fontWeight: 400,
    },
    switchTitleUnchecked: {
      lineHeight: 1.8,
      color: '#828282',
      fontWeight: 400,
    },
  }),
);

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const menuProps: Partial<MenuProps> = {
  // `getContentAnchorEl: null` fixes floating multiselect menu.
  // This is a bug and it is probably resolved in mui v5.
  getContentAnchorEl: null,
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 'auto',
    },
  },
};

// We export the downloadCsv function to be tested independently
export const downloadCsv = (
  dataForCsv: MutableRefObject<{ [key: string]: any[] }>,
  filename: string,
) => {
  return () => {
    // FIXME: make this work for multi-location/periods
    const dateColumn = 'Date';
    const getKeyName = (key: string, chartName: string) =>
      key.endsWith('_avg')
        ? `${snakeCase(chartName)}_avg`
        : snakeCase(chartName);

    const columnsNamesPerChart = Object.entries(dataForCsv.current).map(
      ([key, value]) => {
        const first = value[0];
        const keys = Object.keys(first);
        const filtered = keys.filter(x => x !== dateColumn);
        const mapped = filtered.map(x => getKeyName(x, key));
        return Object.fromEntries(mapped.map(x => [x, x]));
      },
    );

    const columnsNames = columnsNamesPerChart.reduce(
      (prev, curr) => ({ ...prev, ...curr }),
      { [dateColumn]: dateColumn },
    );

    const merged = Object.entries(dataForCsv.current)
      .map(([key, value]) => {
        return value.map(x => {
          return mapKeys(x, (v, k) =>
            k === dateColumn ? dateColumn : getKeyName(k, key),
          );
        });
      })
      .flat();
    if (merged.length < 1) {
      return;
    }

    const grouped = groupBy(merged, dateColumn);
    // The blueprint of objects array data
    const initialObjectsArrayBlueprintData = Object.keys(columnsNames).reduce(
      (acc: { [key: string]: string }, key) => {
        // eslint-disable-next-line fp/no-mutation
        acc[key] = '';
        return acc;
      },
      {},
    );

    const objectsArray = Object.entries(grouped).map(([, value]) => {
      return value.reduce(
        (prev, curr) => ({ ...prev, ...curr }),
        initialObjectsArrayBlueprintData,
      );
    });

    downloadToFile(
      {
        content: castObjectsArrayToCsv(objectsArray, columnsNames, ','),
        isUrl: false,
      },
      filename,
      'text/csv',
    );
  };
};

const ChartsPanel = memo(
  ({ setPanelSize, setResultsPage }: ChartsPanelProps) => {
    const { countryAdmin0Id, country, multiCountry } = appConfig;
    const boundaryLayerData = useSelector(
      layerDataSelector(boundaryLayer.id),
    ) as LayerData<BoundaryLayerProps> | undefined;
    const { data } = boundaryLayerData || {};
    const classes = useStyles();
    const [compareLocations, setCompareLocations] = useState(false);
    const [comparePeriods, setComparePeriods] = useState(false);

    // first location state
    const [admin0Key, setAdmin0Key] = useState<string>('');
    const [admin1Key, setAdmin1Key] = useState<string>('');
    const [admin2Key, setAdmin2Key] = useState<string>('');
    const [selectedAdmin1Area, setSelectedAdmin1Area] = useState('');
    const [selectedAdmin2Area, setSelectedAdmin2Area] = useState('');
    const [adminLevel, setAdminLevel] = useState<0 | 1 | 2>(
      countryAdmin0Id ? 0 : 1,
    );
    // second (compared) location state
    const [secondAdmin0Key, setSecondAdmin0Key] = useState<string>('');
    const [secondAdmin1Key, setSecondAdmin1Key] = useState<string>('');
    const [secondAdmin2Key, setSecondAdmin2Key] = useState<string>('');
    const [secondSelectedAdmin1Area, setSecondSelectedAdmin1Area] = useState(
      '',
    );
    const [secondSelectedAdmin2Area, setSecondSelectedAdmin2Area] = useState(
      '',
    );
    const [secondAdminLevel, setSecondAdminLevel] = useState<0 | 1 | 2>(
      countryAdmin0Id ? 0 : 1,
    );

    const [selectedLayerTitles, setSelectedLayerTitles] = useState<
      string[] | TFunctionKeys[]
    >([]);

    const oneDayInMs = 24 * 60 * 60 * 1000;
    const oneYearInMs = 365 * oneDayInMs;
    const [startDate1, setStartDate1] = useState<number | null>(
      new Date().getTime() - oneYearInMs,
    );
    const [endDate1, setEndDate1] = useState<number | null>(
      new Date().getTime(),
    );
    // cheat here and shift compared dates by 1 day to avoid duplicate
    // keys in title components
    const [startDate2, setStartDate2] = useState<number | null>(
      new Date().getTime() - oneYearInMs - oneDayInMs,
    );
    const [endDate2, setEndDate2] = useState<number | null>(
      new Date().getTime() - oneDayInMs,
    );
    const [adminProperties, setAdminProperties] = useState<GeoJsonProperties>();
    const [secondAdminProperties, setSecondAdminProperties] = useState<
      GeoJsonProperties
    >();
    const dataForCsv = useRef<{ [key: string]: any[] }>({});

    const { t } = useSafeTranslation();

    const tabValue = useSelector(leftPanelTabValueSelector);

    const generateCSVFilename = useCallback(() => {
      return [
        country,
        selectedAdmin1Area ?? '',
        selectedAdmin2Area ?? '',
        ...selectedLayerTitles,
        secondSelectedAdmin1Area ?? '',
        secondSelectedAdmin2Area ?? '',
      ]
        .filter(x => !!x)
        .map(snakeCase)
        .join('_');
    }, [
      country,
      secondSelectedAdmin1Area,
      secondSelectedAdmin2Area,
      selectedAdmin1Area,
      selectedAdmin2Area,
      selectedLayerTitles,
    ]);

    const onChangeChartLayers = useCallback(
      (event: React.ChangeEvent<{ value: unknown }>) => {
        setSelectedLayerTitles(event.target.value as string[]);
      },
      [],
    );

    const locationString = (
      countryName: string,
      adm1Name: string,
      adm2Name: string,
      admLevel: number,
    ) => {
      const l = admLevel;
      return `${countryName}${l > 0 ? ` - ${adm1Name}` : ''}${
        l > 1 ? ` - ${adm2Name}` : ''
      }`;
    };

    const timePeriodString = (
      startDate: number | null,
      endDate: number | null,
    ) => {
      if (startDate === null || endDate === null) {
        return '';
      }
      const options = {
        weekday: undefined,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      };
      const formatDate = (d: number) => {
        const dd = new Date(d);
        return dd.toLocaleDateString(t('date_locale'), options);
      };

      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    };

    const showChartsPanel = useMemo(() => {
      return (
        adminProperties &&
        startDate1 &&
        tabIndex === tabValue &&
        selectedLayerTitles.length >= 1
      );
    }, [adminProperties, startDate1, selectedLayerTitles.length, tabValue]);

    useEffect(() => {
      if (!adminProperties && countryAdmin0Id && data) {
        setAdminProperties(getProperties(data));
      }
    }, [adminProperties, countryAdmin0Id, data]);

    useEffect(() => {
      if (!secondAdminProperties && countryAdmin0Id && data) {
        setSecondAdminProperties(getProperties(data));
      }
    }, [secondAdminProperties, countryAdmin0Id, data]);

    useEffect(() => {
      if (adminProperties && startDate1 && selectedLayerTitles.length >= 1) {
        setPanelSize(PanelSize.xlarge);
      } else {
        setPanelSize(PanelSize.medium);
      }
    }, [
      setPanelSize,
      adminProperties,
      startDate1,
      startDate2,
      selectedLayerTitles.length,
      countryAdmin0Id,
    ]);

    const renderResultsPage = useMemo(() => {
      // chart size is not responsive once it is mounted
      // seems to be possible in the newer chart.js versions
      // here we mount a new component if one chart
      if (
        adminProperties &&
        startDate1 &&
        endDate1 &&
        selectedLayerTitles.length === 1 &&
        !compareLocations &&
        !comparePeriods
      ) {
        // show a single chart
        const chartLayer = chartLayers.find(layer =>
          selectedLayerTitles.includes(layer.title),
        );
        return (
          <Box
            style={{
              maxHeight: '50vh',
              width: '100%',
            }}
          >
            <ChartSection
              chartLayer={chartLayer as WMSLayerProps}
              adminProperties={adminProperties || {}}
              adminLevel={adminLevel}
              startDate={startDate1}
              endDate={endDate1}
              dataForCsv={dataForCsv}
            />
          </Box>
        );
      }
      // show 2 or more charts (multi layer or comparisons)
      const mainChartList =
        selectedLayerTitles.length >= 1
          ? chartLayers
              .filter(layer => selectedLayerTitles.includes(layer.title))
              .map(layer => (
                <Box
                  key={layer.title}
                  style={{
                    height: '240px',
                    minWidth: '40%',
                    flex: 1,
                    position: 'relative',
                  }}
                >
                  <ChartSection
                    chartLayer={layer}
                    adminProperties={adminProperties as GeoJsonProperties}
                    adminLevel={adminLevel}
                    startDate={startDate1 as number}
                    endDate={endDate1 as number}
                    dataForCsv={dataForCsv}
                  />
                </Box>
              ))
          : [];
      // now add comparison charts
      const comparing = compareLocations || comparePeriods;
      const comparedAdminProperties = compareLocations
        ? secondAdminProperties
        : adminProperties;
      const comparedAdminLevel = compareLocations
        ? secondAdminLevel
        : adminLevel;
      const comparedAdmin1Area = compareLocations
        ? secondSelectedAdmin1Area
        : selectedAdmin1Area;
      const comparedAdmin2Area = compareLocations
        ? secondSelectedAdmin2Area
        : selectedAdmin2Area;
      const comparedStartDate = comparePeriods ? startDate2 : startDate1;
      const comparedEndDate = comparePeriods ? endDate2 : endDate1;

      const comparisonChartList = comparing
        ? chartLayers
            .filter(layer => selectedLayerTitles.includes(layer.title))
            .map(layer => (
              <Box
                key={`${layer.title} bleh`}
                style={{
                  height: '240px',
                  minWidth: '40%',
                  flex: 1,
                  position: 'relative',
                }}
              >
                <ChartSection
                  chartLayer={layer}
                  adminProperties={comparedAdminProperties as GeoJsonProperties}
                  adminLevel={comparedAdminLevel}
                  startDate={comparedStartDate as number}
                  endDate={comparedEndDate as number}
                  dataForCsv={dataForCsv}
                />
              </Box>
            ))
        : [];
      const zipped = mainChartList
        .map((chart, idx) => [chart, comparisonChartList[idx]])
        .flat();

      let titleStrings: string[][] = [[]];
      if (compareLocations) {
        console.log('comparing locs', adminLevel);
        titleStrings = [
          [
            locationString(
              country,
              selectedAdmin1Area,
              selectedAdmin2Area,
              adminLevel,
            ),
            'main',
          ],
          [
            locationString(
              country,
              comparedAdmin1Area,
              comparedAdmin2Area,
              comparedAdminLevel,
            ),
            'compared',
          ],
        ];
      } else if (comparePeriods) {
        titleStrings = [
          [timePeriodString(startDate1, endDate1), 'main'],
          [timePeriodString(startDate2, endDate2), 'compared'],
        ];
        console.log('comp time', startDate1, startDate2, titleStrings);
      }

      const titles = titleStrings.map(title => (
        <Box
          key={`${title[0]}${title[1]}`}
          style={{
            height: '30px',
            minWidth: '40%',
            flex: 1,
            position: 'relative',
          }}
        >
          <Typography className={classes.textLabel}>{title[0]}</Typography>
        </Box>
      ));
      return [...titles, ...zipped];
    }, [
      adminProperties,
      startDate1,
      endDate1,
      selectedLayerTitles,
      compareLocations,
      comparePeriods,
      secondAdminProperties,
      secondAdminLevel,
      adminLevel,
      secondSelectedAdmin1Area,
      selectedAdmin1Area,
      secondSelectedAdmin2Area,
      selectedAdmin2Area,
      startDate2,
      endDate2,
      country,
      timePeriodString,
      classes.textLabel,
    ]);

    useEffect(() => {
      if (showChartsPanel) {
        setPanelSize(PanelSize.xlarge);
        setResultsPage(
          <Box className={classes.chartsPanelCharts}>{renderResultsPage}</Box>,
        );
      }

      return () => setResultsPage(null);
    }, [
      classes.chartsPanelCharts,
      renderResultsPage,
      setPanelSize,
      setResultsPage,
      showChartsPanel,
    ]);

    const handleClearAllSelectedCharts = useCallback(() => {
      setSelectedLayerTitles([]);
      // Clear the date
      setStartDate1(new Date().getTime() - oneYearInMs);
      setEndDate1(new Date().getTime());
      setStartDate2(new Date().getTime() - oneYearInMs);
      setEndDate2(new Date().getTime());
      // reset the admin level
      setAdminLevel(countryAdmin0Id ? 0 : 1);
      setSecondAdminLevel(countryAdmin0Id ? 0 : 1);
      // reset admin 1 titles
      setAdmin1Key('');
      setSecondAdmin1Key('');
      // reset the admin 2 titles
      setAdmin2Key('');
      setSecondAdmin2Key('');
    }, [countryAdmin0Id, oneYearInMs]);

    const handleOnChangeCompareLocationsSwitch = useCallback(() => {
      if (comparePeriods) {
        setComparePeriods(false);
      }
      setCompareLocations(!compareLocations);
    }, [compareLocations, comparePeriods]);

    const handleOnChangeComparePeriodsSwitch = useCallback(() => {
      if (compareLocations) {
        setCompareLocations(false);
      }
      setComparePeriods(!comparePeriods);
    }, [compareLocations, comparePeriods]);

    const chartsSelectRenderValue = useCallback(
      selected => {
        return selected
          .map((selectedValue: string | TFunctionKeys) => {
            return t(selectedValue);
          })
          .join(', ');
      },
      [t],
    );

    if (tabIndex !== tabValue) {
      return null;
    }

    return (
      <Box className={classes.chartsPanelParams}>
        <FormGroup className={classes.formGroup}>
          <FormControlLabel
            style={{ marginLeft: 20 }}
            control={
              <Switch
                checked={compareLocations}
                size="small"
                className={classes.switch}
                classes={{
                  switchBase: classes.switchBase,
                  track: classes.switchTrack,
                }}
                onChange={handleOnChangeCompareLocationsSwitch}
                inputProps={{
                  'aria-label': 'Compare Locations',
                }}
              />
            }
            label={
              <Typography
                className={
                  compareLocations
                    ? classes.switchTitle
                    : classes.switchTitleUnchecked
                }
              >
                {t('Compare Locations')}
              </Typography>
            }
            checked={compareLocations}
          />

          <LocationSelector
            admin0Key={admin0Key}
            admin1Key={admin1Key}
            admin2Key={admin2Key}
            boundaryLayer={boundaryLayer}
            country={country}
            countryAdmin0Id={countryAdmin0Id}
            data={data}
            getProperties={getProperties}
            multiCountry={multiCountry}
            setAdmin0Key={setAdmin0Key}
            setAdmin1Key={setAdmin1Key}
            setAdmin2Key={setAdmin2Key}
            setAdminLevel={setAdminLevel}
            setAdminProperties={setAdminProperties}
            setSelectedAdmin1Area={setSelectedAdmin1Area}
            setSelectedAdmin2Area={setSelectedAdmin2Area}
          />
          {compareLocations && (
            <LocationSelector
              admin0Key={secondAdmin0Key}
              admin1Key={secondAdmin1Key}
              admin2Key={secondAdmin2Key}
              boundaryLayer={boundaryLayer}
              country={country}
              countryAdmin0Id={countryAdmin0Id}
              data={data}
              getProperties={getProperties}
              multiCountry={multiCountry}
              setAdmin0Key={setSecondAdmin0Key}
              setAdmin1Key={setSecondAdmin1Key}
              setAdmin2Key={setSecondAdmin2Key}
              setAdminLevel={setSecondAdminLevel}
              setAdminProperties={setSecondAdminProperties}
              setSelectedAdmin1Area={setSecondSelectedAdmin1Area}
              setSelectedAdmin2Area={setSecondSelectedAdmin2Area}
            />
          )}
        </FormGroup>

        <FormGroup className={classes.formGroup}>
          <FormControlLabel
            style={{ marginLeft: 20 }}
            control={
              <Switch
                checked={comparePeriods}
                size="small"
                className={classes.switch}
                classes={{
                  switchBase: classes.switchBase,
                  track: classes.switchTrack,
                }}
                onChange={handleOnChangeComparePeriodsSwitch}
                inputProps={{
                  'aria-label': 'Compare Periods',
                }}
              />
            }
            label={
              <Typography
                className={
                  comparePeriods
                    ? classes.switchTitle
                    : classes.switchTitleUnchecked
                }
              >
                {t('Compare Periods')}
              </Typography>
            }
            checked={comparePeriods}
          />
          <TimePeriodSelector
            startDate={startDate1}
            setStartDate={setStartDate1}
            endDate={endDate1}
            setEndDate={setEndDate1}
          />
          {comparePeriods && (
            <TimePeriodSelector
              startDate={startDate2}
              setStartDate={setStartDate2}
              endDate={endDate2}
              setEndDate={setEndDate2}
            />
          )}
        </FormGroup>

        <FormControl className={classes.layerFormControl}>
          <InputLabel id="chart-layers-mutiple-checkbox-label">
            {t('Select Charts')}
          </InputLabel>
          <Select
            labelId="chart-layers-mutiple-checkbox-label"
            id="chart-layers-mutiple-checkbox"
            multiple
            value={selectedLayerTitles}
            onChange={onChangeChartLayers}
            input={<Input />}
            renderValue={chartsSelectRenderValue}
            MenuProps={menuProps}
          >
            {chartLayers.map(layer => (
              <MenuItem key={layer.id} value={layer.title}>
                <Checkbox
                  checked={selectedLayerTitles.indexOf(layer.title) > -1}
                  color="primary"
                />
                <ListItemText
                  classes={{ primary: classes.textLabel }}
                  primary={t(layer.title)}
                />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          className={classes.downloadButton}
          onClick={downloadCsv(dataForCsv, generateCSVFilename())}
          disabled={
            !(
              adminProperties &&
              startDate1 &&
              tabIndex === tabValue &&
              selectedLayerTitles.length >= 1
            )
          }
        >
          <Typography variant="body2">{t('Download CSV')}</Typography>
        </Button>
        <Button
          className={classes.clearAllSelectionsButton}
          onClick={handleClearAllSelectedCharts}
          disabled={
            !(
              adminProperties &&
              startDate1 &&
              tabIndex === tabValue &&
              selectedLayerTitles.length >= 1
            )
          }
        >
          <Typography variant="body2">{t('Clear All')}</Typography>
        </Button>
      </Box>
    );
  },
);

interface ChartsPanelProps {
  setPanelSize: React.Dispatch<React.SetStateAction<PanelSize>>;
  setResultsPage: React.Dispatch<React.SetStateAction<JSX.Element | null>>;
}

export default ChartsPanel;
