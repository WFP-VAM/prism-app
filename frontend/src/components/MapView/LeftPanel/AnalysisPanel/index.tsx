import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import {
  Button,
  createStyles,
  FormControl,
  FormControlLabel,
  InputAdornment,
  Input,
  LinearProgress,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  withStyles,
  WithStyles,
  IconButton,
} from '@material-ui/core';
import {
  BarChartOutlined,
  DateRangeRounded,
  CloseRounded,
} from '@material-ui/icons';
import { useDispatch, useSelector } from 'react-redux';
import DatePicker from 'react-datepicker';
import { isNil, range } from 'lodash';
import moment from 'moment';
import {
  mapSelector,
  layersSelector,
  layerDataSelector,
} from '../../../../context/mapStateSlice/selectors';
import { useUrlHistory } from '../../../../utils/url-utils';
import { availableDatesSelector } from '../../../../context/serverStateSlice';
import {
  AnalysisDispatchParams,
  PolygonAnalysisDispatchParams,
  analysisResultSelector,
  clearAnalysisResult,
  isAnalysisLoadingSelector,
  requestAndStoreAnalysis,
  requestAndStorePolygonAnalysis,
  setIsMapLayerActive,
} from '../../../../context/analysisResultStateSlice';
import {
  AdminLevelType,
  AggregationOperations,
  AdminLevelDataLayerProps,
  HazardDataType,
  RasterType,
  WMSLayerProps,
  LayerKey,
  BoundaryLayerProps,
  GeometryType,
} from '../../../../config/types';
import {
  getAdminLevelCount,
  getAdminLevelLayer,
} from '../../../../utils/admin-utils';
import { LayerData } from '../../../../context/layers/layer-data';
import {
  LayerDefinitions,
  getDisplayBoundaryLayers,
} from '../../../../config/utils';
import { useSafeTranslation } from '../../../../i18n';
import { getDateFromList } from '../../../../utils/data-utils';
import { getPossibleDatesForLayer } from '../../../../utils/server-utils';
import {
  downloadCSVFromTableData,
  BaselineLayerResult,
  ExposedPopulationResult,
  PolygonAnalysisResult,
  useAnalysisTableColumns,
} from '../../../../utils/analysis-utils';
import {
  refreshBoundaries,
  safeDispatchRemoveLayer,
  safeDispatchAddLayer,
} from '../../../../utils/map-utils';
import { removeLayer } from '../../../../context/mapStateSlice';
import { DEFAULT_DATE_FORMAT } from '../../../../utils/name-utils';
import LayerDropdown from '../../Layers/LayerDropdown';
import SimpleDropdown from '../../../Common/SimpleDropdown';
import AnalysisTable from './AnalysisTable';
import { Extent } from '../../Layers/raster-utils';

function AnalysisPanel({
  extent,
  isPanelExtended,
  setIsPanelExtended,
  classes,
}: AnalysisPanelProps) {
  const dispatch = useDispatch();
  const map = useSelector(mapSelector);
  const selectedLayers = useSelector(layersSelector);
  const {
    updateHistory,
    removeKeyFromUrl,
    resetAnalysisParams,
    updateAnalysisParams,
    getAnalysisParams,
  } = useUrlHistory();

  const availableDates = useSelector(availableDatesSelector);
  const analysisResult = useSelector(analysisResultSelector);

  const isAnalysisLoading = useSelector(isAnalysisLoadingSelector);

  const {
    analysisHazardLayerId: hazardLayerIdFromUrl,
    analysisBaselineLayerId: baselineLayerIdFromUrl,
    analysisDate: selectedDateFromUrl,
    analysisStatistic: selectedStatisticFromUrl,
    analysisThresholdAbove: aboveThresholdFromUrl,
    analysisThresholdBelow: belowThresholdFromUrl,
    analysisAdminLevel: adminLevelFromUrl,
    analysisStartDate: selectedStartDateFromUrl,
    analysisEndDate: selectedEndDateFromUrl,
  } = getAnalysisParams();

  // form elements
  const [hazardLayerId, setHazardLayerId] = useState<LayerKey | undefined>(
    hazardLayerIdFromUrl,
  );
  const [statistic, setStatistic] = useState(
    (selectedStatisticFromUrl as AggregationOperations) ||
      AggregationOperations.Mean,
  );
  const [baselineLayerId, setBaselineLayerId] = useState<LayerKey | undefined>(
    baselineLayerIdFromUrl,
  );
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [belowThreshold, setBelowThreshold] = useState(
    belowThresholdFromUrl || '',
  );
  const [aboveThreshold, setAboveThreshold] = useState(
    aboveThresholdFromUrl || '',
  );
  const [thresholdError, setThresholdError] = useState<string | null>(null);

  // for polygon intersection analysis
  const [adminLevel, setAdminLevel] = useState<AdminLevelType>(
    Number(adminLevelFromUrl || '1') as AdminLevelType,
  );
  const [startDate, setStartDate] = useState<number | null>(null);
  const [endDate, setEndDate] = useState<number | null>(null);

  // find layer for the given adminLevel
  const adminLevelLayer = getAdminLevelLayer(adminLevel);
  const adminLevelLayerData = useSelector(
    // if we couldn't find an admin layer, just return undefined
    adminLevelLayer ? layerDataSelector(adminLevelLayer.id) : () => undefined,
  ) as LayerData<BoundaryLayerProps> | undefined;

  // get variables derived from state
  const selectedHazardLayer = hazardLayerId
    ? (LayerDefinitions[hazardLayerId] as WMSLayerProps)
    : null;
  const hazardDataType: HazardDataType | null = selectedHazardLayer
    ? selectedHazardLayer.geometry || RasterType.Raster
    : null;
  const availableHazardDates = selectedHazardLayer
    ? getPossibleDatesForLayer(selectedHazardLayer, availableDates)?.map(
        d => new Date(d),
      ) || []
    : undefined;

  const BASELINE_URL_LAYER_KEY = 'baselineLayerId';
  const preSelectedBaselineLayer = selectedLayers.find(
    l => l.type === 'admin_level_data',
  );
  const [previousBaselineId, setPreviousBaselineId] = useState<
    LayerKey | undefined
  >(preSelectedBaselineLayer?.id);

  const { t } = useSafeTranslation();

  // check if there is any available date from the url, otherwise use last available date for the selected hazard layer
  const lastAvailableHazardDate = availableHazardDates
    ? getDateFromList(
        selectedDateFromUrl ? new Date(selectedDateFromUrl) : null,
        availableHazardDates,
      )?.getTime() || null
    : null;
  const lastAvailableHazardStartDate = availableHazardDates
    ? getDateFromList(
        selectedStartDateFromUrl ? new Date(selectedStartDateFromUrl) : null,
        availableHazardDates,
      )?.getTime() || null
    : null;
  const lastAvailableHazardEndDate = availableHazardDates
    ? getDateFromList(
        selectedEndDateFromUrl ? new Date(selectedEndDateFromUrl) : null,
        availableHazardDates,
      )?.getTime() || null
    : null;
  const { translatedColumns } = useAnalysisTableColumns(analysisResult);

  // set default date after dates finish loading and when hazard layer changes
  useEffect(() => {
    if (isNil(lastAvailableHazardDate)) {
      setSelectedDate(null);
    } else {
      setSelectedDate(lastAvailableHazardDate);
    }
    if (isNil(lastAvailableHazardStartDate)) {
      setStartDate(null);
    } else {
      setStartDate(lastAvailableHazardStartDate);
    }
    if (isNil(lastAvailableHazardEndDate)) {
      setEndDate(null);
    } else {
      setEndDate(lastAvailableHazardEndDate);
    }
  }, [
    availableDates,
    hazardLayerId,
    lastAvailableHazardDate,
    lastAvailableHazardStartDate,
    lastAvailableHazardEndDate,
  ]);

  const onOptionChange = <T extends string>(
    setterFunc: Dispatch<SetStateAction<T>>,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as T;
    setterFunc(value);
    return value;
  };
  // specially for threshold values, also does error checking
  const onThresholdOptionChange = (thresholdType: 'above' | 'below') => (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const setterFunc =
      thresholdType === 'above' ? setAboveThreshold : setBelowThreshold;
    const changedOption = onOptionChange(setterFunc)(event);
    // setting a value doesn't update the existing value until next render, therefore we must decide whether to access the old one or the newly change one here.
    const aboveThresholdValue = parseFloat(
      thresholdType === 'above' ? changedOption : aboveThreshold,
    );
    const belowThresholdValue = parseFloat(
      thresholdType === 'below' ? changedOption : belowThreshold,
    );
    if (belowThresholdValue > aboveThresholdValue) {
      setThresholdError('Below threshold is larger than above threshold!');
    } else {
      setThresholdError(null);
    }
  };

  const statisticOptions = Object.entries(AggregationOperations)
    .filter(([, value]) => value !== AggregationOperations.Sum) // sum is used only for exposure analysis.
    .map(([key, value]) => (
      <FormControlLabel
        key={key}
        value={value}
        control={
          <Radio
            className={classes.radioOptions}
            color="default"
            size="small"
          />
        }
        label={
          <Typography className={classes.analysisPanelParamText}>
            {t(key)}
          </Typography>
        }
      />
    ));
  const activateUniqueBoundary = (forceAdminLevel?: BoundaryLayerProps) => {
    if (forceAdminLevel) {
      // remove displayed boundaries
      getDisplayBoundaryLayers().forEach(l => {
        if (l.id !== forceAdminLevel.id) {
          safeDispatchRemoveLayer(map, l, dispatch);
        }
      });

      safeDispatchAddLayer(
        map,
        { ...forceAdminLevel, isPrimary: true },
        dispatch,
      );
      return;
    }

    if (!baselineLayerId) {
      throw new Error('Layer should be selected to run analysis');
    }

    const baselineLayer = LayerDefinitions[
      baselineLayerId
    ] as AdminLevelDataLayerProps;

    if (baselineLayer.boundary) {
      const boundaryLayer = LayerDefinitions[
        baselineLayer.boundary
      ] as BoundaryLayerProps;
      // remove displayed boundaries
      getDisplayBoundaryLayers().forEach(l => {
        if (l.id !== boundaryLayer.id) {
          safeDispatchRemoveLayer(map, l, dispatch);
        }
      });

      safeDispatchAddLayer(
        map,
        { ...boundaryLayer, isPrimary: true },
        dispatch,
      );
    } else {
      getDisplayBoundaryLayers().forEach(l => {
        safeDispatchAddLayer(map, l, dispatch);
      });
    }
  };

  const clearAnalysis = () => {
    dispatch(clearAnalysisResult());
    setIsPanelExtended(false);
    setHazardLayerId(hazardLayerIdFromUrl);
    setStatistic(
      (selectedStatisticFromUrl as AggregationOperations) ||
        AggregationOperations.Mean,
    );
    setBaselineLayerId(baselineLayerIdFromUrl);
    setSelectedDate(null);
    setBelowThreshold(belowThresholdFromUrl || '');
    setAboveThreshold(aboveThresholdFromUrl || '');
    setThresholdError(null);

    resetAnalysisParams();
    refreshBoundaries(map, dispatch);

    if (previousBaselineId) {
      const previousBaseline = LayerDefinitions[
        previousBaselineId
      ] as AdminLevelDataLayerProps;
      updateHistory(BASELINE_URL_LAYER_KEY, previousBaselineId);
      safeDispatchAddLayer(map, previousBaseline, dispatch);
      // check isMapLayerActive on analysis clear
      // to avoid miss behaviour on boundary layers
      dispatch(setIsMapLayerActive(true));
    }
  };

  const runAnalyser = async () => {
    if (preSelectedBaselineLayer) {
      setPreviousBaselineId(preSelectedBaselineLayer.id);
      removeKeyFromUrl(BASELINE_URL_LAYER_KEY);
      // no need to safely dispatch remove we are sure
      dispatch(removeLayer(preSelectedBaselineLayer));
    }

    if (analysisResult) {
      clearAnalysis();
    }

    if (!extent) {
      return;
    } // hasn't been calculated yet

    if (!selectedHazardLayer) {
      throw new Error('Hazard layer should be selected to run analysis');
    }

    if (hazardDataType === GeometryType.Polygon) {
      if (!startDate) {
        throw new Error('Date Range must be given to run analysis');
      }
      if (!endDate) {
        throw new Error('Date Range must be given to run analysis');
      }
      if (!adminLevelLayer || !adminLevelLayerData) {
        // technically we can't get here because the run analysis button
        // is disabled while the admin level data loads
        // but we have to put this in so the typescript compiler
        // doesn't throw an error when we try to access the data
        // property of adminLevelLayerData
        throw new Error('Admin level data is still loading');
      }

      const params: PolygonAnalysisDispatchParams = {
        hazardLayer: selectedHazardLayer,
        adminLevel,
        adminLevelLayer,
        adminLevelData: adminLevelLayerData.data,
        startDate,
        endDate,
        extent,
      };
      activateUniqueBoundary(adminLevelLayer);
      // update history
      updateAnalysisParams({
        analysisHazardLayerId: hazardLayerId,
        analysisAdminLevel: adminLevel.toString(),
        analysisStartDate: moment(startDate).format(DEFAULT_DATE_FORMAT),
        analysisEndDate: moment(endDate).format(DEFAULT_DATE_FORMAT),
        analysisStatistic: statistic,
      });
      dispatch(requestAndStorePolygonAnalysis(params));
    } else {
      if (!selectedDate) {
        throw new Error('Date must be given to run analysis');
      }

      if (!baselineLayerId) {
        throw new Error('Baseline layer should be selected to run analysis');
      }

      const selectedBaselineLayer = LayerDefinitions[
        baselineLayerId
      ] as AdminLevelDataLayerProps;

      activateUniqueBoundary();

      const params: AnalysisDispatchParams = {
        hazardLayer: selectedHazardLayer,
        baselineLayer: selectedBaselineLayer,
        date: selectedDate,
        statistic,
        extent,
        threshold: {
          above: parseFloat(aboveThreshold) || undefined,
          below: parseFloat(belowThreshold) || undefined,
        },
      };

      // update history
      updateAnalysisParams({
        analysisHazardLayerId: hazardLayerId,
        analysisBaselineLayerId: baselineLayerId,
        analysisDate: moment(selectedDate).format(DEFAULT_DATE_FORMAT),
        analysisStatistic: statistic,
        analysisThresholdAbove: aboveThreshold || undefined,
        analysisThresholdBelow: belowThreshold || undefined,
      });

      dispatch(requestAndStoreAnalysis(params));
    }
  };

  return (
    <div className={classes.root}>
      <div className={classes.analysisPanel}>
        <div id="analysis-parameters" className={classes.analysisPanelParams}>
          <div className={classes.analysisPanelParamContainer}>
            <LayerDropdown
              type="wms"
              value={hazardLayerId}
              setValue={setHazardLayerId}
              className={classes.analysisPanelParamText}
              label={t('Hazard Layer')}
              placeholder="Choose hazard layer"
            />
          </div>

          {hazardDataType === GeometryType.Polygon && (
            <>
              <div className={classes.analysisPanelParamContainer}>
                <Typography variant="body2">Admin Level</Typography>
                <SimpleDropdown
                  value={adminLevel}
                  options={range(getAdminLevelCount()).map(i => [
                    (i + 1) as AdminLevelType,
                    `Admin ${i + 1}`,
                  ])}
                  onChange={setAdminLevel}
                />
              </div>

              <div className={classes.analysisPanelParamContainer}>
                <Typography variant="body2">{t('Date Range')}</Typography>
                <div className={classes.dateRangePicker}>
                  <Typography variant="body2">{t('Start')}</Typography>
                  <DatePicker
                    selected={startDate ? new Date(startDate) : null}
                    onChange={date =>
                      setStartDate(date?.getTime() || startDate)
                    }
                    maxDate={new Date()}
                    todayButton="Today"
                    peekNextMonth
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    customInput={<Input />}
                    popperClassName={classes.calendarPopper}
                    includeDates={availableHazardDates}
                  />
                </div>
                <div className={classes.dateRangePicker}>
                  <Typography variant="body2">{t('End')}</Typography>
                  <DatePicker
                    selected={endDate ? new Date(endDate) : null}
                    onChange={date => setEndDate(date?.getTime() || endDate)}
                    maxDate={new Date()}
                    todayButton="Today"
                    peekNextMonth
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    customInput={<Input />}
                    popperClassName={classes.calendarPopper}
                    includeDates={availableHazardDates}
                  />
                </div>
              </div>
            </>
          )}

          {hazardDataType === RasterType.Raster && (
            <>
              <div className={classes.analysisPanelParamContainer}>
                <LayerDropdown
                  type="admin_level_data"
                  value={baselineLayerId || undefined}
                  setValue={setBaselineLayerId}
                  className={classes.analysisPanelParamText}
                  label={t('Baseline Layer')}
                  placeholder="Choose baseline layer"
                />
              </div>
              <div className={classes.analysisPanelParamContainer}>
                <Typography
                  className={classes.analysisParamTitle}
                  variant="body2"
                >
                  {t('Statistic')}
                </Typography>
                <FormControl component="div">
                  <RadioGroup
                    name="statistics"
                    value={statistic}
                    onChange={onOptionChange(setStatistic)}
                  >
                    {statisticOptions}
                  </RadioGroup>
                </FormControl>
              </div>
              <div className={classes.analysisPanelParamContainer}>
                <Typography
                  className={classes.analysisParamTitle}
                  variant="body2"
                >
                  {t('Threshold')}
                </Typography>
                <TextField
                  id="outlined-number-low"
                  error={!!thresholdError}
                  helperText={t(thresholdError || '')}
                  className={classes.numberField}
                  label={t('Below')}
                  type="number"
                  value={belowThreshold}
                  onChange={onThresholdOptionChange('below')}
                  variant="outlined"
                />
                <TextField
                  id="outlined-number-high"
                  label={t('Above')}
                  classes={{ root: classes.numberField }}
                  value={aboveThreshold}
                  onChange={onThresholdOptionChange('above')}
                  type="number"
                  variant="outlined"
                />
              </div>
              <div className={classes.datePickerContainer}>
                <Typography
                  className={classes.analysisParamTitle}
                  variant="body2"
                >
                  {`${t('Date')}: `}
                </Typography>
                <DatePicker
                  locale={t('date_locale')}
                  dateFormat="PP"
                  selected={selectedDate ? new Date(selectedDate) : null}
                  onChange={date =>
                    setSelectedDate(date?.getTime() || selectedDate)
                  }
                  maxDate={new Date()}
                  todayButton={t('Today')}
                  peekNextMonth
                  showMonthDropdown
                  showYearDropdown
                  dropdownMode="select"
                  customInput={
                    <Input
                      className={classes.analysisPanelParamText}
                      disableUnderline
                      endAdornment={
                        <InputAdornment position="end">
                          <DateRangeRounded />
                        </InputAdornment>
                      }
                    />
                  }
                  popperClassName={classes.calendarPopper}
                  includeDates={availableHazardDates}
                />
              </div>
            </>
          )}
        </div>

        {!isAnalysisLoading &&
          analysisResult &&
          (analysisResult instanceof BaselineLayerResult ||
            analysisResult instanceof PolygonAnalysisResult) && (
            <div
              className={classes.analysisButtonContainer}
              style={{
                width: isPanelExtended ? '50%' : '100%',
              }}
            >
              <Button
                className={classes.analysisButton}
                disabled={!analysisResult}
                onClick={() => setIsPanelExtended(!isPanelExtended)}
              >
                <Typography variant="body2">
                  {isPanelExtended ? t('Hide Table') : t('View Table')}
                </Typography>
              </Button>
              <Button
                className={classes.analysisButton}
                onClick={clearAnalysis}
              >
                <Typography variant="body2">{t('Clear Analysis')}</Typography>
              </Button>
              <Button
                className={classes.bottomButton}
                onClick={() =>
                  downloadCSVFromTableData(
                    analysisResult,
                    translatedColumns,
                    selectedDate,
                  )
                }
              >
                <Typography variant="body2">{t('Download CSV')}</Typography>
              </Button>
            </div>
          )}
        {(!analysisResult ||
          analysisResult instanceof ExposedPopulationResult) && (
          <div className={classes.analysisButtonContainer}>
            <Button
              className={classes.bottomButton}
              onClick={runAnalyser}
              startIcon={<BarChartOutlined />}
              disabled={
                !!thresholdError || // if there is a threshold error
                isAnalysisLoading || // or analysis is currently loading
                !hazardLayerId || // or hazard layer hasn't been selected
                (hazardDataType === GeometryType.Polygon
                  ? !startDate || !endDate || !adminLevelLayerData
                  : !selectedDate || !baselineLayerId) // or date hasn't been selected // or baseline layer hasn't been selected
              }
            >
              <Typography variant="body2">{t('Run Analysis')}</Typography>
            </Button>
            {isAnalysisLoading ? <LinearProgress /> : null}
          </div>
        )}
      </div>
      {!isAnalysisLoading &&
        analysisResult &&
        (analysisResult instanceof BaselineLayerResult ||
          analysisResult instanceof PolygonAnalysisResult) &&
        isPanelExtended && (
          <div className={classes.analysisTableContainer}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Typography className={classes.analysisTableTitle}>
                {selectedHazardLayer?.title}
              </Typography>
              <IconButton
                aria-label="close"
                onClick={() => setIsPanelExtended(!isPanelExtended)}
                className={classes.analysisTableCloseButton}
              >
                <CloseRounded />
              </IconButton>
            </div>
            <AnalysisTable
              tableData={analysisResult.tableData}
              columns={translatedColumns}
            />
          </div>
        )}
    </div>
  );
}

const styles = () =>
  createStyles({
    root: {
      display: 'flex',
      flexDirection: 'row',
      width: '100%',
      height: '100%',
    },
    analysisPanel: {
      display: 'relative',
      paddingTop: 30,
      flexGrow: 4,
    },
    analysisPanelParams: {
      padding: 10,
    },
    analysisParamTitle: {
      color: 'black',
    },
    analysisPanelParamText: {
      width: 140,
      color: 'black',
    },
    analysisPanelParamContainer: {
      marginBottom: 30,
      marginLeft: 10,
      width: 'auto',
      color: 'black',
    },
    analysisTableContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '50%',
    },
    datePickerContainer: {
      marginLeft: 10,
      width: 'auto',
      color: 'black',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
    },
    radioOptions: {
      color: 'black',
      padding: '2px 10px 2px 20px',
    },
    analysisButtonContainer: {
      position: 'absolute',
      backgroundColor: '#566064',
      width: '100%',
      bottom: 0,
    },
    analysisButton: {
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
    bottomButton: {
      backgroundColor: '#62B2BD',
      '&:hover': {
        backgroundColor: '#62B2BD',
      },
      marginTop: 10,
      marginBottom: 10,
      marginLeft: '25%',
      marginRight: '25%',
      width: '50%',
      '&.Mui-disabled': { opacity: 0.5 },
    },
    numberField: {
      paddingRight: '10px',
      marginTop: '10px',
      maxWidth: '140px',
      '& .MuiInputBase-root': {
        color: 'black',
      },
      '& label': {
        color: '#333333',
      },
    },
    calendarPopper: {
      zIndex: 3,
    },
    dateRangePicker: {
      display: 'inline-block',
      marginRight: '15px',
      minWidth: '125px',
      width: '100px',
    },
    analysisTableTitle: {
      fontSize: '16px',
      fontWeight: 400,
      color: 'black',
    },
    analysisTableCloseButton: {
      position: 'absolute',
      top: 15,
      right: 0,
    },
  });

interface AnalysisPanelProps extends WithStyles<typeof styles> {
  extent?: Extent;
  isPanelExtended: boolean;
  setIsPanelExtended: React.Dispatch<React.SetStateAction<boolean>>;
}

export default withStyles(styles)(AnalysisPanel);
