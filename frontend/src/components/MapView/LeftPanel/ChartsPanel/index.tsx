import {Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  Input,
  InputLabel,
  ListItemText,
  MenuItem,
  MenuProps,
  Select,
  Switch,
  Typography} from '@mui/material';
import { GeoJsonProperties } from 'geojson';
import { makeStyles, createStyles } from '@mui/styles';
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSelector } from 'react-redux';
import { appConfig } from 'config';
import {
  AdminCodeString,
  AdminLevelType,
  PanelSize,
  WMSLayerProps,
  Panel,
} from 'config/types';
import {
  getBoundaryLayersByAdminLevel,
  getWMSLayersWithChart,
} from 'config/utils';
import { leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import { useSafeTranslation } from 'i18n';
import { useBoundaryData } from 'utils/useBoundaryData';
import { buildCsvFileName, getProperties } from 'components/MapView/utils';
import DownloadCsvButton from 'components/MapView/DownloadCsvButton';
import {
  ChartLocationSelector,
  ChartDateRangeSelector,
} from 'components/Common/ChartFormComponents';
import ChartSection from './ChartSection';
import TimePeriodSelector from './TimePeriodSelector';
import DateSlider from './DateSlider';
import {
  getCountryName,
  formatLocationString,
  formatTimePeriodString,
  oneDayInMs,
  oneYearInMs,
} from '../utils';

// Menu configuration
const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const menuProps: Partial<MenuProps> = {
  anchorOrigin: {
    vertical: 'bottom',
    horizontal: 'left',
  },
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 'auto',
    },
  },
};

// Chart configuration
const { multiCountry, countryAdmin0Id } = appConfig;
const MAX_ADMIN_LEVEL = multiCountry ? 3 : 2;
const boundaryLayer = getBoundaryLayersByAdminLevel(MAX_ADMIN_LEVEL);
const chartLayers = getWMSLayersWithChart();

// Time constants
const yearsToFetchDataFor = 5;
const oneYearInTicks = 34;

const tabPanelType = Panel.Charts;

const ChartsPanel = memo(() => {
  const { data } = useBoundaryData(boundaryLayer.id);
  const classes = useStyles();
  const [compareLocations, setCompareLocations] = useState(false);
  const [comparePeriods, setComparePeriods] = useState(false);

  // first location state
  const [admin0Key] = useState<AdminCodeString>('' as AdminCodeString);
  const [admin1Key, setAdmin1Key] = useState<AdminCodeString>(
    '' as AdminCodeString,
  );
  const [admin2Key, setAdmin2Key] = useState<AdminCodeString>(
    '' as AdminCodeString,
  );
  const [selectedAdmin1Area, setSelectedAdmin1Area] = useState('');
  const [selectedAdmin2Area, setSelectedAdmin2Area] = useState('');
  const [adminLevel, setAdminLevel] = useState<AdminLevelType>(
    (countryAdmin0Id ? 0 : 1) as AdminLevelType,
  );
  // second (compared) location state
  const [secondAdmin0Key, setSecondAdmin0Key] = useState<AdminCodeString>(
    '' as AdminCodeString,
  );
  const [secondAdmin1Key, setSecondAdmin1Key] = useState<AdminCodeString>(
    '' as AdminCodeString,
  );
  const [secondAdmin2Key, setSecondAdmin2Key] = useState<AdminCodeString>(
    '' as AdminCodeString,
  );
  const [secondSelectedAdmin1Area, setSecondSelectedAdmin1Area] = useState('');
  const [secondSelectedAdmin2Area, setSecondSelectedAdmin2Area] = useState('');
  const [secondAdminLevel, setSecondAdminLevel] = useState<AdminLevelType>(
    (countryAdmin0Id ? 0 : 1) as AdminLevelType,
  );

  const [selectedLayerTitles, setSelectedLayerTitles] = useState<
    string[] | any[]
  >([]);

  const [startDate1, setStartDate1] = useState<number | null>(
    new Date().getTime() - oneYearInMs * yearsToFetchDataFor,
  );
  const [endDate1, setEndDate1] = useState<number | null>(new Date().getTime());
  // cheat here and shift compared dates by 1 day to avoid duplicate
  // keys in title components
  const [startDate2, setStartDate2] = useState<number | null>(
    new Date().getTime() - oneYearInMs * 2 - oneDayInMs,
  );
  const [endDate2, setEndDate2] = useState<number | null>(
    new Date().getTime() - oneYearInMs - oneDayInMs,
  );
  const [adminProperties, setAdminProperties] = useState<GeoJsonProperties>();
  const [secondAdminProperties, setSecondAdminProperties] =
    useState<GeoJsonProperties>();
  // maxDataTicks used for setting slider max ticks
  const [maxDataTicks, setMaxDataTicks] = useState(0);
  // chartRange is the output of the slider used to select data shown in charts
  const [chartRange, setChartRange] = useState<[number, number]>([0, 0]);
  // chartSelectedDateRange is the selected min and max date selected by the slider used to set the labels.
  const [chartSelectedDateRange, setChartSelectedDateRange] = useState<
    [string, string]
  >(['', '']);
  // chartMaxDateRange keeps the max and min dates from all datasets, so smaller datasets can be extended
  const [chartMaxDateRange, setChartMaxDateRange] = useState<[string, string]>([
    '',
    '',
  ]);
  const [showSlider, setShowSlider] = useState(true);
  const [maxChartValues, setMaxChartValues] = useState<number[]>([]);
  const [minChartValues, setMinChartValues] = useState<number[]>([]);

  function resetSlider() {
    setMaxDataTicks(0);
    setChartRange([0, 0]);
    setChartSelectedDateRange(['', '']);
    setChartMaxDateRange(['', '']);
  }

  // Reset slider when charts' date changes
  useEffect(() => {
    resetSlider();
  }, [startDate1, endDate1]);

  useEffect(() => {
    if (selectedLayerTitles.length === 0) {
      resetSlider();
    }
  }, [selectedLayerTitles.length]);

  useEffect(() => {
    const start = maxDataTicks - oneYearInTicks;
    setChartRange([start > 0 ? start : 0, maxDataTicks]);
  }, [maxDataTicks]);

  useEffect(() => {
    if (comparePeriods) {
      setShowSlider(false);
      setStartDate1(new Date().getTime() - oneYearInMs);
    } else {
      setShowSlider(true);
      setStartDate1(new Date().getTime() - oneYearInMs * yearsToFetchDataFor);
    }
  }, [comparePeriods]);

  const dataForCsv = useRef<{ [key: string]: any[] }>({});
  const dataForSecondCsv = useRef<{ [key: string]: any[] }>({});

  const { t } = useSafeTranslation();

  const tabValue = useSelector(leftPanelTabValueSelector);

  const onChangeChartLayers = useCallback(
    (event: any) => {
      if (compareLocations || comparePeriods) {
        setSelectedLayerTitles([event.target.value] as string[]);
      } else {
        setSelectedLayerTitles(event.target.value as string[]);
      }
    },
    [compareLocations, comparePeriods],
  );

  const showChartsPanel = useMemo(
    () =>
      adminProperties &&
      startDate1 &&
      tabPanelType === tabValue &&
      selectedLayerTitles.length >= 1,
    [adminProperties, startDate1, selectedLayerTitles.length, tabValue],
  );

  useEffect(() => {
    if (!adminProperties && countryAdmin0Id && data) {
      setAdminProperties(getProperties(data));
    }
  }, [adminProperties, data]);

  useEffect(() => {
    if (!secondAdminProperties && countryAdmin0Id && data) {
      setSecondAdminProperties(getProperties(data));
    }
  }, [secondAdminProperties, data]);

  const singleChartFilenamePrefix = React.useMemo(
    () =>
      adminProperties
        ? [
            getCountryName(adminProperties),
            selectedAdmin1Area,
            selectedAdmin2Area,
          ].map(x => t(x))
        : [],
    [adminProperties, selectedAdmin1Area, selectedAdmin2Area, t],
  );

  const firstCSVFilename = adminProperties
    ? buildCsvFileName([
        ...singleChartFilenamePrefix,
        ...(selectedLayerTitles as string[]),
        comparePeriods ? 'first_period' : '',
      ])
    : '';

  const secondCSVFilename = secondAdminProperties
    ? buildCsvFileName([
        getCountryName(secondAdminProperties),
        compareLocations ? secondSelectedAdmin1Area : selectedAdmin1Area,
        compareLocations ? secondSelectedAdmin2Area : selectedAdmin2Area,
        ...(selectedLayerTitles as string[]),
        comparePeriods ? 'second_period' : '',
      ])
    : '';

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

      if (!chartLayer) {
        return null;
      }

      return (
        <Box
          style={{
            height: '50vh',
            width: '100%',
          }}
        >
          <ChartSection
            key={`${chartLayer.id}-${startDate1}-${endDate1}-${adminLevel}-${adminProperties?.admin0Name || ''}-${adminProperties?.admin1Name || ''}-${adminProperties?.admin2Name || ''}`}
            setChartSelectedDateRange={setChartSelectedDateRange}
            setMaxDataTicks={setMaxDataTicks}
            chartMaxDateRange={chartMaxDateRange}
            setChartMaxDateRange={setChartMaxDateRange}
            chartRange={comparePeriods ? undefined : chartRange}
            chartLayer={chartLayer as WMSLayerProps}
            adminProperties={adminProperties || {}}
            adminLevel={adminLevel}
            startDate={startDate1}
            endDate={endDate1}
            dataForCsv={dataForCsv}
            chartProps={{
              showDownloadIcons: true,
              downloadFilenamePrefix: singleChartFilenamePrefix,
            }}
          />
        </Box>
      );
    }
    // show 2 or more charts (multi layer or comparisons)
    const comparing = compareLocations || comparePeriods;
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
                  key={`${layer.id}-${startDate1}-${endDate1}-${adminLevel}-${adminProperties?.admin0Name || ''}-${adminProperties?.admin1Name || ''}-${adminProperties?.admin2Name || ''}`}
                  chartMaxDateRange={
                    comparePeriods ? undefined : chartMaxDateRange
                  }
                  setChartMaxDateRange={setChartMaxDateRange}
                  setChartSelectedDateRange={setChartSelectedDateRange}
                  setMaxDataTicks={setMaxDataTicks}
                  chartRange={comparePeriods ? undefined : chartRange}
                  chartLayer={layer}
                  adminProperties={adminProperties as GeoJsonProperties}
                  adminLevel={adminLevel}
                  startDate={startDate1 as number}
                  endDate={endDate1 as number}
                  dataForCsv={dataForCsv}
                  setMaxChartValues={setMaxChartValues}
                  setMinChartValues={setMinChartValues}
                  maxChartValue={
                    comparing ? Math.max(...maxChartValues) : undefined
                  }
                  minChartValue={
                    comparing ? Math.min(...minChartValues) : undefined
                  }
                  chartProps={{
                    showDownloadIcons: true,
                    downloadFilenamePrefix: singleChartFilenamePrefix,
                  }}
                />
              </Box>
            ))
        : [];

    // now add comparison charts
    const comparedAdminProperties = compareLocations
      ? secondAdminProperties
      : adminProperties;
    const comparedAdminLevel = compareLocations ? secondAdminLevel : adminLevel;
    const comparedAdmin1Area = compareLocations
      ? secondSelectedAdmin1Area
      : selectedAdmin1Area;
    const comparedAdmin2Area = compareLocations
      ? secondSelectedAdmin2Area
      : selectedAdmin2Area;
    const comparedStartDate = comparePeriods ? startDate2 : startDate1;
    const comparedEndDate = comparePeriods ? endDate2 : endDate1;

    const secondChartFilenamePrefix = secondAdminProperties
      ? [
          getCountryName(secondAdminProperties),
          secondSelectedAdmin1Area,
          secondSelectedAdmin2Area,
        ].map(x => t(x))
      : [];

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
                key={`${startDate1}-${endDate1}`}
                chartMaxDateRange={
                  comparePeriods ? undefined : chartMaxDateRange
                }
                setChartMaxDateRange={setChartMaxDateRange}
                setChartSelectedDateRange={setChartSelectedDateRange}
                setMaxDataTicks={setMaxDataTicks}
                chartRange={comparePeriods ? undefined : chartRange}
                chartLayer={layer}
                adminProperties={
                  // default value prevents crash, but shows ugly warning
                  (comparedAdminProperties as GeoJsonProperties) || {}
                }
                adminLevel={comparedAdminLevel}
                startDate={comparedStartDate as number}
                endDate={comparedEndDate as number}
                dataForCsv={dataForSecondCsv}
                setMaxChartValues={setMaxChartValues}
                setMinChartValues={setMinChartValues}
                maxChartValue={Math.max(...maxChartValues)}
                minChartValue={Math.min(...minChartValues)}
                chartProps={{
                  showDownloadIcons: true,
                  downloadFilenamePrefix: secondChartFilenamePrefix,
                }}
              />
            </Box>
          ))
      : [];
    const zipped = mainChartList
      .map((chart, idx) => [chart, comparisonChartList[idx]])
      .flat();

    const titleStrings: () => string[][] = () => {
      if (compareLocations && adminProperties && secondAdminProperties) {
        return [
          [
            formatLocationString(
              getCountryName(adminProperties),
              selectedAdmin1Area,
              selectedAdmin2Area,
              adminLevel,
            ),
            'main',
          ],
          [
            formatLocationString(
              getCountryName(secondAdminProperties),
              comparedAdmin1Area,
              comparedAdmin2Area,
              comparedAdminLevel,
            ),
            'compared',
          ],
        ];
      }
      if (comparePeriods) {
        return [
          [formatTimePeriodString(startDate1, endDate1, t), 'main'],
          [formatTimePeriodString(startDate2, endDate2, t), 'compared'],
        ];
      }
      return [];
    };

    const titles = titleStrings().map(title => (
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
    // add a location string above everything if comparing periods
    const locationBox =
      comparePeriods && adminProperties ? (
        <Box
          key="locationBox"
          style={{
            height: '30px',
            minWidth: '80%',
            flex: 1,
            position: 'relative',
          }}
        >
          <Typography className={classes.textLabel}>
            {formatLocationString(
              getCountryName(adminProperties),
              selectedAdmin1Area,
              selectedAdmin2Area,
              adminLevel,
            )}
          </Typography>
        </Box>
      ) : null;
    return [locationBox, ...titles, ...zipped];
  }, [
    adminLevel,
    adminProperties,
    chartMaxDateRange,
    chartRange,
    classes.textLabel,
    compareLocations,
    comparePeriods,
    endDate1,
    endDate2,
    maxChartValues,
    minChartValues,
    secondAdminLevel,
    secondAdminProperties,
    secondSelectedAdmin1Area,
    secondSelectedAdmin2Area,
    selectedAdmin1Area,
    selectedAdmin2Area,
    selectedLayerTitles,
    singleChartFilenamePrefix,
    startDate1,
    startDate2,
    t,
  ]);

  const handleClearAllSelectedCharts = useCallback(() => {
    setSelectedLayerTitles([]);
    // Clear the date
    setStartDate1(new Date().getTime() - oneYearInMs);
    setEndDate1(new Date().getTime());
    setStartDate2(new Date().getTime() - oneYearInMs);
    setEndDate2(new Date().getTime());
    // reset the admin level
    setAdminLevel((countryAdmin0Id ? 0 : 1) as AdminLevelType);
    setSecondAdminLevel((countryAdmin0Id ? 0 : 1) as AdminLevelType);
    // reset admin 1 titles
    setAdmin1Key('' as AdminCodeString);
    setSecondAdmin1Key('' as AdminCodeString);
    // reset the admin 2 titles
    setAdmin2Key('' as AdminCodeString);
    setSecondAdmin2Key('' as AdminCodeString);
  }, []);

  const handleOnChangeCompareLocationsSwitch = useCallback(() => {
    if (comparePeriods) {
      setComparePeriods(false);
    }
    if (selectedLayerTitles.length > 1) {
      // only allow a single layer to be charted when comparing locations
      setSelectedLayerTitles([selectedLayerTitles[0]]);
    }
    // default to first country when we first activate
    // location comparison
    if (secondAdminProperties === undefined) {
      setSecondAdminProperties(adminProperties);
    }
    if (secondAdmin0Key === '') {
      setSecondAdmin0Key(admin0Key);
    }
    setCompareLocations(!compareLocations);
  }, [
    admin0Key,
    adminProperties,
    compareLocations,
    comparePeriods,
    secondAdmin0Key,
    secondAdminProperties,
    selectedLayerTitles,
  ]);

  const handleOnChangeComparePeriodsSwitch = useCallback(() => {
    if (compareLocations) {
      setCompareLocations(false);
    }
    if (selectedLayerTitles.length > 1) {
      // only allow a single layer to be charted when comparing periods
      setSelectedLayerTitles([selectedLayerTitles[0]]);
    }
    setComparePeriods(!comparePeriods);
  }, [compareLocations, comparePeriods, selectedLayerTitles]);

  const chartsSelectRenderValue = useCallback(
    (selected: any) =>
      selected
        .map((selectedValue: string | any) => t(selectedValue))
        .join(', '),
    [t],
  );

  if (tabPanelType !== tabValue) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        width: showChartsPanel ? '100vw' : undefined,
      }}
    >
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

          <Box style={{ paddingLeft: 20, paddingRight: 20 }}>
            {compareLocations && (
              <Typography
                style={{
                  color: 'black',
                  fontWeight: 600,
                  marginBottom: 8,
                  marginLeft: 10,
                }}
                variant="body2"
              >
                {t('Location 1')}
              </Typography>
            )}
            <ChartLocationSelector
              boundaryLayerData={data}
              boundaryLayer={boundaryLayer}
              admin1Key={admin1Key}
              admin2Key={admin2Key}
              stacked
              hideLabel={compareLocations}
              onAdmin1Change={(key, properties, level) => {
                setAdmin1Key(key);
                setAdmin2Key('' as AdminCodeString);
                setAdminLevel(level);
                setAdminProperties(properties);
                const admin1Name =
                  data &&
                  boundaryLayer?.adminLevelNames?.[level - 1] &&
                  properties?.[boundaryLayer.adminLevelNames[level - 1]];
                setSelectedAdmin1Area(admin1Name || '');
                setSelectedAdmin2Area('');
              }}
              onAdmin2Change={(key, properties, level) => {
                setAdmin2Key(key);
                setAdminLevel(level);
                setAdminProperties(properties);
                const admin2Name =
                  data &&
                  boundaryLayer?.adminLevelNames?.[level - 1] &&
                  properties?.[boundaryLayer.adminLevelNames[level - 1]];
                setSelectedAdmin2Area(admin2Name || '');
              }}
            />
          </Box>
          {compareLocations && (
            <Box style={{ paddingLeft: 20, paddingRight: 20 }}>
              <Typography
                style={{
                  color: 'black',
                  fontWeight: 600,
                  marginBottom: 8,
                  marginLeft: 10,
                }}
                variant="body2"
              >
                {t('Location 2')}
              </Typography>
              <ChartLocationSelector
                boundaryLayerData={data}
                boundaryLayer={boundaryLayer}
                admin1Key={secondAdmin1Key}
                admin2Key={secondAdmin2Key}
                stacked
                hideLabel
                onAdmin1Change={(key, properties, level) => {
                  setSecondAdmin1Key(key);
                  setSecondAdmin2Key('' as AdminCodeString);
                  setSecondAdminLevel(level);
                  setSecondAdminProperties(properties);
                  const admin1Name =
                    data &&
                    boundaryLayer?.adminLevelNames?.[level - 1] &&
                    properties?.[boundaryLayer.adminLevelNames[level - 1]];
                  setSecondSelectedAdmin1Area(admin1Name || '');
                  setSecondSelectedAdmin2Area('');
                }}
                onAdmin2Change={(key, properties, level) => {
                  setSecondAdmin2Key(key);
                  setSecondAdminLevel(level);
                  setSecondAdminProperties(properties);
                  const admin2Name =
                    data &&
                    boundaryLayer?.adminLevelNames?.[level - 1] &&
                    properties?.[boundaryLayer.adminLevelNames[level - 1]];
                  setSecondSelectedAdmin2Area(admin2Name || '');
                }}
              />
            </Box>
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

          {comparePeriods && (
            <>
              <Box style={{ paddingLeft: 20, paddingRight: 20 }}>
                <Typography
                  style={{
                    color: 'black',
                    fontWeight: 600,
                    marginBottom: 8,
                    marginLeft: 10,
                  }}
                  variant="body2"
                >
                  {t('Period 1')}
                </Typography>
                <ChartDateRangeSelector
                  startDate={startDate1}
                  endDate={endDate1}
                  onStartDateChange={setStartDate1}
                  onEndDateChange={setEndDate1}
                  stacked
                  hideLabel
                />
              </Box>
              <Box style={{ paddingLeft: 20, paddingRight: 20 }}>
                <Typography
                  style={{
                    color: 'black',
                    fontWeight: 600,
                    marginBottom: 8,
                    marginLeft: 10,
                  }}
                  variant="body2"
                >
                  {t('Period 2')}
                </Typography>
                <ChartDateRangeSelector
                  startDate={startDate2}
                  endDate={endDate2}
                  onStartDateChange={setStartDate2}
                  onEndDateChange={setEndDate2}
                  stacked
                  hideLabel
                />
              </Box>
            </>
          )}
        </FormGroup>

        <FormControl className={classes.layerFormControl}>
          <InputLabel id="chart-layers-mutiple-checkbox-label">
            {t('Select Charts')}
          </InputLabel>
          <Select
            labelId="chart-layers-mutiple-checkbox-label"
            id="chart-layers-mutiple-checkbox"
            multiple={!(compareLocations || comparePeriods)}
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
        <DownloadCsvButton
          filesData={[
            {
              fileName: firstCSVFilename,
              data: dataForCsv.current,
            },
            {
              fileName: secondCSVFilename,
              data: dataForSecondCsv.current,
            },
          ]}
          disabled={
            !(
              adminProperties &&
              startDate1 &&
              tabPanelType === tabValue &&
              selectedLayerTitles.length >= 1
            )
          }
        />
        <Button
          className={classes.clearAllSelectionsButton}
          onClick={handleClearAllSelectedCharts}
          disabled={
            !(
              adminProperties &&
              startDate1 &&
              tabPanelType === tabValue &&
              selectedLayerTitles.length >= 1
            )
          }
        >
          <Typography variant="body2">{t('Clear All')}</Typography>
        </Button>
      </Box>
      {showChartsPanel && (
        <Box className={classes.chartsContainer}>
          <Box className={classes.chartsPanelCharts}>{renderResultsPage}</Box>
          {showSlider && maxDataTicks > 1 && (
            <>
              <TimePeriodSelector
                wrapperStyle={{ padding: '0 2rem 0 2rem' }}
                startDate={startDate1}
                setStartDate={setStartDate1}
                endDate={endDate1}
                setEndDate={setEndDate1}
                title={comparePeriods ? t('Period 1') : null}
                startLabel="Min Date"
                endLabel="Max Date"
              />
              <DateSlider
                chartSelectedDateRange={chartSelectedDateRange}
                chartRange={chartRange}
                setChartRange={setChartRange}
                maxDataTicks={maxDataTicks}
                disabled={selectedLayerTitles.length < 1}
              />
            </>
          )}
        </Box>
      )}
    </div>
  );
});

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
      marginLeft: 20,
      width: '100%',
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
      marginBottom: '2em',
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
    chartsContainer: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      width: '100%',
    },
    chartsPanelCharts: {
      alignContent: 'start',
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
      marginBottom: 10,
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
      fontWeight: 400,
    },
  }),
);

export default ChartsPanel;
