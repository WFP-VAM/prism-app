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
  BoundaryLayerProps,
  PanelSize,
  WMSLayerProps,
  Panel,
} from 'config/types';
import {
  getBoundaryLayersByAdminLevel,
  getWMSLayersWithChart,
} from 'config/utils';
import { LayerData } from 'context/layers/layer-data';
import { leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import { useSafeTranslation } from 'i18n';
import { buildCsvFileName } from 'components/MapView/utils';
import DownloadCsvButton from 'components/MapView/DownloadCsvButton';
import ChartSection from './ChartSection';
import LocationSelector from './LocationSelector';
import TimePeriodSelector from './TimePeriodSelector';

import { oneDayInMs, oneYearInMs } from '../utils';
import DateSlider from './DateSlider';

// Load boundary layer for Admin2
// WARNING - Make sure the dataviz_ids are available in the boundary file for Admin2
const { multiCountry } = appConfig;
const MAX_ADMIN_LEVEL = multiCountry ? 3 : 2;
const boundaryLayer = getBoundaryLayersByAdminLevel(MAX_ADMIN_LEVEL);

const chartLayers = getWMSLayersWithChart();

const tabPanelType = Panel.Charts;

function getProperties(
  layerData: LayerData<BoundaryLayerProps>['data'],
  id?: AdminCodeString,
  adminLevel?: AdminLevelType,
): GeoJsonProperties {
  // Return any properties, used for national level data.
  if (id === undefined || adminLevel === undefined) {
    // TODO: this does not work in multicountry, the first feature might not
    // be part of the country we expect, but probably not a problem as this data
    // does not go anywhere anyway
    return layerData.features[0].properties;
  }
  const indexLevel = multiCountry ? adminLevel : adminLevel - 1;
  const adminCode = boundaryLayer.adminLevelCodes[indexLevel];
  const item = layerData.features.find(
    elem => elem.properties && elem.properties[adminCode] === id,
  );
  return item?.properties ?? {};
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

const ChartsPanel = memo(() => {
  const { countryAdmin0Id, country } = appConfig;

  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;
  const { data } = boundaryLayerData || {};
  const classes = useStyles();
  const [compareLocations, setCompareLocations] = useState(false);
  const [comparePeriods, setComparePeriods] = useState(false);

  // first location state
  const [admin0Key, setAdmin0Key] = useState<AdminCodeString>(
    '' as AdminCodeString,
  );
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

  const yearsToFetchDataFor = 5;

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
  const oneYearInTicks = 34;
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
    (event: React.ChangeEvent<{ value: unknown }>) => {
      if (compareLocations || comparePeriods) {
        setSelectedLayerTitles([event.target.value] as string[]);
      } else {
        setSelectedLayerTitles(event.target.value as string[]);
      }
    },
    [compareLocations, comparePeriods],
  );

  const getCountryName: (admProps: GeoJsonProperties) => string = useCallback(
    admProps => (multiCountry ? admProps?.admin0Name : country),
    [country],
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
  }, [adminProperties, countryAdmin0Id, data]);

  useEffect(() => {
    if (!secondAdminProperties && countryAdmin0Id && data) {
      setSecondAdminProperties(getProperties(data));
    }
  }, [secondAdminProperties, countryAdmin0Id, data]);

  const singleDownloadChartPrefix = React.useMemo(
    () =>
      adminProperties
        ? [
            getCountryName(adminProperties),
            selectedAdmin1Area,
            selectedAdmin2Area,
          ].map(x => t(x))
        : [],
    [
      adminProperties,
      getCountryName,
      selectedAdmin1Area,
      selectedAdmin2Area,
      t,
    ],
  );

  const firstCSVFilename = adminProperties
    ? buildCsvFileName([
        ...singleDownloadChartPrefix,
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
      return (
        <Box
          style={{
            height: '50vh',
            width: '100%',
          }}
        >
          <ChartSection
            key={`${startDate1}-${endDate1}`}
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
              downloadFilenamePrefix: singleDownloadChartPrefix,
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
                  key={`${startDate1}-${endDate1}`}
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
                    downloadFilenamePrefix: singleDownloadChartPrefix,
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
                  downloadFilenamePrefix: singleDownloadChartPrefix,
                }}
              />
            </Box>
          ))
      : [];
    const zipped = mainChartList
      .map((chart, idx) => [chart, comparisonChartList[idx]])
      .flat();

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
        return dd.toLocaleDateString(t('date_locale'), options as any);
      };

      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    };

    const titleStrings: () => string[][] = () => {
      if (compareLocations && adminProperties && secondAdminProperties) {
        return [
          [
            locationString(
              getCountryName(adminProperties),
              selectedAdmin1Area,
              selectedAdmin2Area,
              adminLevel,
            ),
            'main',
          ],
          [
            locationString(
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
          [timePeriodString(startDate1, endDate1), 'main'],
          [timePeriodString(startDate2, endDate2), 'compared'],
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
            {locationString(
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
    getCountryName,
    maxChartValues,
    minChartValues,
    secondAdminLevel,
    secondAdminProperties,
    secondSelectedAdmin1Area,
    secondSelectedAdmin2Area,
    selectedAdmin1Area,
    selectedAdmin2Area,
    selectedLayerTitles,
    singleDownloadChartPrefix,
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
  }, [countryAdmin0Id]);

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
            title={compareLocations ? t('Location 1') : null}
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
              title={compareLocations ? t('Location 2') : null}
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

          {comparePeriods && (
            <>
              <TimePeriodSelector
                startDate={startDate1}
                setStartDate={setStartDate1}
                endDate={endDate1}
                setEndDate={setEndDate1}
                title={comparePeriods ? t('Period 1') : null}
                startLabel="Start"
                endLabel="End"
              />
              <TimePeriodSelector
                startDate={startDate2}
                setStartDate={setStartDate2}
                endDate={endDate2}
                setEndDate={setEndDate2}
                title={comparePeriods ? t('Period 2') : null}
                startLabel="Start"
                endLabel="End"
              />
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

export default ChartsPanel;
