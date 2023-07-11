import {
  Box,
  Button,
  Checkbox,
  createStyles,
  FormControl,
  Input,
  InputAdornment,
  InputLabel,
  ListItemText,
  makeStyles,
  MenuItem,
  MenuProps,
  Select,
  TextField,
  Typography,
} from '@material-ui/core';
import { DateRangeRounded } from '@material-ui/icons';
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
import DatePicker from 'react-datepicker';
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
import {
  getOrderedAreas,
  OrderedArea,
} from 'components/MapView/Layers/BoundaryDropdown';
import { downloadToFile } from 'components/MapView/utils';
import ChartSection from './ChartSection';

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
    selectRoot: {
      marginTop: 30,
      color: 'black',
      minWidth: '300px',
      maxWidth: '350px',
      width: 'auto',
      '& label': {
        color: '#333333',
      },
      '& .MuiInputBase-root': {
        color: 'black',
        '&:hover fieldset': {
          borderColor: '#333333',
        },
        '&.Mui-focused fieldset': {
          borderColor: '#333333',
        },
      },
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
    datePickerContainer: {
      marginTop: 45,
      width: 'auto',
      color: 'black',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      borderBottom: ' 1px solid #858585',
      minWidth: 300,
    },
    calendarPopper: {
      zIndex: 3,
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
    removeAdmin: {
      fontWeight: 'bold',
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
    const [admin0Key, setAdmin0Key] = useState('');
    const [admin1Key, setAdmin1Key] = useState('');
    const [admin2Key, setAdmin2Key] = useState('');
    const [adminLevel, setAdminLevel] = useState<0 | 1 | 2>(
      countryAdmin0Id ? 0 : 1,
    );

    const [selectedLayerTitles, setSelectedLayerTitles] = useState<
      string[] | TFunctionKeys[]
    >([]);
    const [selectedDate, setSelectedDate] = useState<number | null>(
      new Date().getTime(),
    );
    const [adminProperties, setAdminProperties] = useState<GeoJsonProperties>();
    const dataForCsv = useRef<{ [key: string]: any[] }>({});

    const { t, i18n: i18nLocale } = useSafeTranslation();

    const tabValue = useSelector(leftPanelTabValueSelector);

    const orderedAdmin0areas = useMemo(() => {
      if (!multiCountry) {
        return [];
      }
      return data ? getOrderedAreas(data, boundaryLayer, '', i18nLocale) : [];
    }, [data, i18nLocale, multiCountry]);

    const orderedAdmin1areas = useMemo(() => {
      return data
        ? getOrderedAreas(
            data,
            boundaryLayer,
            '',
            i18nLocale,
            multiCountry ? 1 : 0,
            admin0Key,
          )
        : [];
    }, [admin0Key, data, i18nLocale, multiCountry]);

    const selectedaAdmin0Area = useMemo(() => {
      return orderedAdmin0areas.find(area => {
        return admin0Key === area.key;
      });
    }, [admin0Key, orderedAdmin0areas]);

    const selectedAdmin1Area = useMemo(() => {
      return orderedAdmin1areas.find(area => {
        return admin1Key === area.key;
      });
    }, [admin1Key, orderedAdmin1areas]);

    const seletectdAdmin2Area = useMemo(() => {
      return selectedAdmin1Area?.children.find(childArea => {
        return admin2Key === childArea.key;
      });
    }, [selectedAdmin1Area, admin2Key]);

    const generateCSVFilename = useCallback(() => {
      return [
        country,
        selectedAdmin1Area?.title ?? '',
        seletectdAdmin2Area?.label ?? '',
        ...selectedLayerTitles,
      ]
        .filter(x => !!x)
        .map(snakeCase)
        .join('_');
    }, [selectedAdmin1Area, seletectdAdmin2Area, selectedLayerTitles, country]);

    const onChangeAdmin0Area = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        // The external chart key for admin 0 is stored in all its children regions
        // here we get the first child properties
        const admin0Id = orderedAdmin0areas.find(area => {
          return area.key === event.target.value;
        })?.children[0].value;

        if (data) {
          setAdminProperties(getProperties(data, admin0Id));
        }
        setAdmin0Key(event.target.value);
        setAdmin1Key('');
        setAdmin2Key('');
        setAdminLevel(0);
      },
      [orderedAdmin0areas, data],
    );

    const onChangeAdmin1Area = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.value) {
          setAdmin1Key('');
          if (countryAdmin0Id || multiCountry) {
            setAdminLevel(0);
          }
          return;
        }

        // The external chart key for admin 1 is stored in all its children regions
        // here we get the first child properties
        const admin1Id = orderedAdmin1areas.find(area => {
          return area.key === event.target.value;
        })?.children[0].value;

        if (data) {
          setAdminProperties(getProperties(data, admin1Id));
        }
        setAdmin1Key(event.target.value);
        setAdmin2Key('');
        setAdminLevel(1);
      },
      [orderedAdmin1areas, countryAdmin0Id, multiCountry, data],
    );

    const onChangeAdmin2Area = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.value) {
          // Unset Admin 2
          // We don't have to reset the adminProperties because any children contains the admin 1 external key
          setAdmin2Key('');
          setAdminLevel(1);
          return;
        }
        const admin2Id = selectedAdmin1Area?.children.find(childArea => {
          return childArea.key === event.target.value;
        })?.value;
        if (data) {
          setAdminProperties(getProperties(data, admin2Id));
        }
        setAdmin2Key(event.target.value);
        setAdminLevel(2);
      },
      [selectedAdmin1Area, data],
    );

    const onChangeChartLayers = useCallback(
      (event: React.ChangeEvent<{ value: unknown }>) => {
        setSelectedLayerTitles(event.target.value as string[]);
      },
      [],
    );

    const showChartsPanel = useMemo(() => {
      return (
        adminProperties &&
        selectedDate &&
        tabIndex === tabValue &&
        selectedLayerTitles.length >= 1
      );
    }, [adminProperties, selectedDate, selectedLayerTitles.length, tabValue]);

    useEffect(() => {
      if (!adminProperties && countryAdmin0Id && data) {
        setAdminProperties(getProperties(data));
      }
    }, [adminProperties, countryAdmin0Id, data]);

    useEffect(() => {
      if (adminProperties && selectedDate && selectedLayerTitles.length >= 1) {
        setPanelSize(PanelSize.xlarge);
      } else {
        setPanelSize(PanelSize.medium);
      }
    }, [
      setPanelSize,
      adminProperties,
      selectedDate,
      selectedLayerTitles.length,
      countryAdmin0Id,
    ]);

    const renderResultsPage = useMemo(() => {
      // chart size is not responsive once it is mounted
      // seems to be possible in the newer chart.js versions
      // here we mount a new component if one chart
      if (adminProperties && selectedDate && selectedLayerTitles.length === 1) {
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
              date={selectedDate}
              dataForCsv={dataForCsv}
            />
          </Box>
        );
      }
      return (
        selectedLayerTitles.length > 1 &&
        chartLayers
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
                date={selectedDate as number}
                dataForCsv={dataForCsv}
              />
            </Box>
          ))
      );
    }, [adminLevel, adminProperties, selectedDate, selectedLayerTitles]);

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
      setSelectedDate(new Date().getTime());
      // reset the admin level
      setAdminLevel(countryAdmin0Id ? 0 : 1);
      // reset admin 1 title
      setAdmin1Key('');
      // reset the admin 2 title
      setAdmin2Key('');
    }, [countryAdmin0Id]);

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

    const findArea = (
      orderedAdminAreas: OrderedArea[],
      adminKeyValue: string,
    ) =>
      orderedAdminAreas.find(category => {
        return category.key === adminKeyValue;
      })?.title;

    const renderAdmin0Value = useCallback(
      admin0keyValue => {
        if (!multiCountry) {
          return country;
        }
        return findArea(orderedAdmin0areas, admin0keyValue);
      },
      [country, multiCountry, orderedAdmin0areas],
    );

    const renderAdmin1Value = useCallback(
      admin1keyValue => {
        return findArea(orderedAdmin1areas, admin1keyValue);
      },
      [orderedAdmin1areas],
    );

    const renderAdmin2Value = useCallback(
      admin2KeyValue => {
        return selectedAdmin1Area?.children.find(childCategory => {
          return childCategory.key === admin2KeyValue;
        })?.label;
      },
      [selectedAdmin1Area],
    );

    if (tabIndex !== tabValue) {
      return null;
    }

    const renderMenuItemList = (orderedAdminArea: OrderedArea[]) =>
      orderedAdminArea.map(option => (
        <MenuItem key={option.key} value={option.key}>
          {option.title}
        </MenuItem>
      ));

    return (
      <Box className={classes.chartsPanelParams}>
        <TextField
          classes={{ root: classes.selectRoot }}
          id="outlined-admin-1"
          select
          label={t('Country')}
          value={selectedaAdmin0Area?.key ?? country}
          SelectProps={{
            renderValue: renderAdmin0Value,
          }}
          onChange={onChangeAdmin0Area}
          variant="outlined"
          disabled={!multiCountry}
        >
          <MenuItem key={country} value={country} disabled>
            {country}
          </MenuItem>
          {renderMenuItemList(orderedAdmin0areas)}
        </TextField>

        <TextField
          classes={{ root: classes.selectRoot }}
          id="outlined-admin-1"
          select
          label={t('Admin 1')}
          value={selectedAdmin1Area?.key ?? ''}
          SelectProps={{
            renderValue: renderAdmin1Value,
          }}
          onChange={onChangeAdmin1Area}
          variant="outlined"
        >
          <MenuItem divider>
            <Box className={classes.removeAdmin}> {t('Remove Admin 1')}</Box>
          </MenuItem>
          {renderMenuItemList(orderedAdmin1areas)}
        </TextField>
        {admin1Key && (
          <TextField
            classes={{ root: classes.selectRoot }}
            id="outlined-admin-2"
            select
            label={t('Admin 2')}
            value={seletectdAdmin2Area?.key ?? ''}
            SelectProps={{
              renderValue: renderAdmin2Value,
            }}
            onChange={onChangeAdmin2Area}
            variant="outlined"
          >
            <MenuItem divider>
              <Box className={classes.removeAdmin}> {t('Remove Admin 2')}</Box>
            </MenuItem>
            {selectedAdmin1Area?.children.map(option => (
              <MenuItem key={option.key} value={option.key}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        )}
        <Box className={classes.datePickerContainer}>
          <Typography className={classes.textLabel} variant="body2">
            {`${t('Date')}: `}
          </Typography>
          <DatePicker
            locale={t('date_locale')}
            dateFormat="PP"
            selected={selectedDate ? new Date(selectedDate) : null}
            onChange={date => setSelectedDate(date?.getTime() || selectedDate)}
            maxDate={new Date()}
            todayButton={t('Today')}
            peekNextMonth
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            customInput={
              <Input
                className={classes.textLabel}
                disableUnderline
                endAdornment={
                  <InputAdornment position="end">
                    <DateRangeRounded />
                  </InputAdornment>
                }
              />
            }
            popperClassName={classes.calendarPopper}
          />
        </Box>
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
              selectedDate &&
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
              selectedDate &&
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
