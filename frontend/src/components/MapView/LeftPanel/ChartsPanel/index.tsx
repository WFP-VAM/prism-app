import {
  Box,
  Checkbox,
  createStyles,
  FormControl,
  Input,
  InputAdornment,
  InputLabel,
  ListItemText,
  makeStyles,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@material-ui/core';
import { DateRangeRounded } from '@material-ui/icons';
import { GeoJsonProperties } from 'geojson';
import React, { useMemo, useState } from 'react';
import DatePicker from 'react-datepicker';
import { useSelector } from 'react-redux';
import { BoundaryLayerProps, PanelSize } from '../../../../config/types';
import {
  getBoundaryLayerSingleton,
  getLayersWithChart,
} from '../../../../config/utils';
import { LayerData } from '../../../../context/layers/layer-data';
import { layerDataSelector } from '../../../../context/mapStateSlice/selectors';
import { useSafeTranslation } from '../../../../i18n';
import { getCategories } from '../../Layers/BoundaryDropdown';
import ChartSection from './ChartSection';

const boundaryLayer = getBoundaryLayerSingleton();

const chartLayers = getLayersWithChart();

function getProperties(
  id: string,
  layerData: LayerData<BoundaryLayerProps>['data'],
) {
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
      marginLeft: 10,
      width: 'auto',
      color: 'black',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
    },
    calendarPopper: {
      zIndex: 3,
    },
    chartsPanelCharts: {
      display: 'flex',
      justifyContent: 'center',
      alignContent: 'center',
      flexWrap: 'wrap',
      flexGrow: 4,
    },
  }),
);

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

function ChartsPanel() {
  const classes = useStyles();
  const [admin1Title, setAdmin1Title] = useState('');
  const [admin2Title, setAdmin2Title] = useState('');
  const [adminLevel, setAdminLevel] = useState<1 | 2>(1);
  const [selectedLayerTitles, setSelectedLayerTitles] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);

  const [adminProperties, setAdminProperties] = useState<GeoJsonProperties>();
  const { t, i18n: i18nLocale } = useSafeTranslation();
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;
  const { data } = boundaryLayerData || {};
  const categories = useMemo(
    () => (data ? getCategories(data, boundaryLayer, '', i18nLocale) : []),
    [data, i18nLocale],
  );

  const onChangeAdmin1 = (event: React.ChangeEvent<HTMLInputElement>) => {
    // The external chart key for admin 1 is stored in all its children regions
    // here we get the first child properties
    const admin2Id = categories.filter(
      elem => elem.title === event.target.value,
    )[0].children[0].value;

    if (data) {
      setAdminProperties(getProperties(admin2Id, data));
    }
    setAdmin1Title(event.target.value);
    setAdmin2Title('');
    setAdminLevel(1);
  };

  const onChangeAdmin2 = (event: React.ChangeEvent<HTMLInputElement>) => {
    const admin2Id = categories
      .filter(elem => elem.title === admin1Title)[0]
      .children.filter(elem => elem.label === event.target.value)[0].value;
    if (data) {
      setAdminProperties(getProperties(admin2Id, data));
    }
    setAdmin2Title(event.target.value);
    setAdminLevel(2);
  };

  const onChangeChartLayers = (
    event: React.ChangeEvent<{ value: unknown }>,
  ) => {
    setSelectedLayerTitles(event.target.value as string[]);
  };

  return (
    <Box className={classes.root}>
      <Box className={classes.chartsPanelParams}>
        <TextField
          classes={{ root: classes.selectRoot }}
          id="outlined-admin-1"
          select
          label={t('Select Admin 1')}
          value={admin1Title}
          onChange={onChangeAdmin1}
          variant="outlined"
        >
          {categories.map(option => (
            <MenuItem key={option.title} value={option.title}>
              {option.title}
            </MenuItem>
          ))}
        </TextField>
        {admin1Title && (
          <TextField
            classes={{ root: classes.selectRoot }}
            id="outlined-admin-2"
            select
            label={t('Select Admin 2')}
            value={admin2Title}
            onChange={onChangeAdmin2}
            variant="outlined"
          >
            {categories
              .filter(elem => elem.title === admin1Title)[0]
              .children.map(option => (
                <MenuItem key={option.value} value={option.label}>
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
            Select Charts
          </InputLabel>
          <Select
            labelId="chart-layers-mutiple-checkbox-label"
            id="chart-layers-mutiple-checkbox"
            multiple
            value={selectedLayerTitles}
            onChange={onChangeChartLayers}
            input={<Input />}
            renderValue={selected => (selected as string[]).join(', ')}
            MenuProps={MenuProps}
          >
            {chartLayers.map(layer => (
              <MenuItem key={layer.id} value={layer.title}>
                <Checkbox
                  checked={selectedLayerTitles.indexOf(layer.title) > -1}
                  color="primary"
                />
                <ListItemText
                  classes={{ primary: classes.textLabel }}
                  primary={layer.title}
                />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Box className={classes.chartsPanelCharts}>
        {adminProperties &&
          selectedDate &&
          selectedLayerTitles.length &&
          chartLayers
            .filter(layer => selectedLayerTitles.includes(layer.title))
            .map(layer => (
              <Box
                style={{
                  width: selectedLayerTitles.length === 1 ? '100%' : '45%',
                }}
              >
                <ChartSection
                  chartLayer={layer}
                  adminProperties={adminProperties}
                  adminLevel={adminLevel}
                  date={selectedDate}
                />
              </Box>
            ))}
      </Box>
    </Box>
  );
}

export default ChartsPanel;
