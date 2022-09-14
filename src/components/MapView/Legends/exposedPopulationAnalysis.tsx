import React from 'react';
import { useSelector, useDispatch } from 'react-redux';

import {
  Button,
  withStyles,
  LinearProgress,
  Switch,
  FormGroup,
  FormControlLabel,
  Grid,
  Typography,
} from '@material-ui/core';
import { ExposedPopulationResult } from '../../../utils/analysis-utils';
import { dateRangeSelector } from '../../../context/mapStateSlice/selectors';
import {
  isDataTableDrawerActiveSelector,
  ExposedPopulationDispatchParams,
  requestAndStoreExposedPopulation,
  isExposureAnalysisLoadingSelector,
  clearAnalysisResult,
  setIsDataTableDrawerActive,
  setCurrentDataDefinition,
  analysisResultSelector,
} from '../../../context/analysisResultStateSlice';
import {
  LayerType,
  AggregationOperations,
  ExposedPopulationDefinition,
  GeometryType,
} from '../../../config/types';
import { LayerDefinitions, TableKey } from '../../../config/utils';
import { Extent } from '../Layers/raster-utils';
import { useSafeTranslation } from '../../../i18n';

const AnalysisButton = withStyles(() => ({
  root: {
    marginTop: '1em',
    marginBottom: '1em',
    fontSize: '0.7em',
  },
}))(Button);

const AnalysisFormControlLabel = withStyles(() => ({
  label: {
    color: 'black',
  },
}))(FormControlLabel);

const ExposedPopulationAnalysis = ({
  result,
  id,
  extent,
  exposure,
}: AnalysisProps) => {
  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const isDataTableDrawerActive = useSelector(isDataTableDrawerActiveSelector);
  const analysisExposureLoading = useSelector(
    isExposureAnalysisLoadingSelector,
  );
  const data = useSelector(analysisResultSelector);

  const { t } = useSafeTranslation();
  const dispatch = useDispatch();

  const runExposureAnalysis = async () => {
    if (data) {
      dispatch(clearAnalysisResult());
    }

    if (!id || !extent || !exposure) {
      return;
    }

    if (!selectedDate) {
      throw new Error('Date must be given to run analysis');
    }

    const layer = LayerDefinitions[id];

    const hazardLayer =
      layer.type === 'wms' && layer.geometry === GeometryType.Polygon
        ? { wfsLayerId: id }
        : { maskLayerId: id };

    const params: ExposedPopulationDispatchParams = {
      exposure,
      date: selectedDate,
      statistic: AggregationOperations.Sum,
      extent,
      ...hazardLayer,
    };

    dispatch(requestAndStoreExposedPopulation(params));
  };

  // Since the exposure analysis doesn't have predefined table in configurations
  // and need to have a `TableKey` will use this util function to handle such case
  // used timestamp to avoid any potential rare name collision
  const generateUniqueTableKey = (activityName: string) => {
    return `${activityName}_${Date.now()}`;
  };

  const ResultSwitches = () => {
    const features = data?.featureCollection.features;
    const hasNoData = features?.length === 0;

    const handleTableViewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(setIsDataTableDrawerActive(e.target.checked));
      dispatch(
        setCurrentDataDefinition({
          id: generateUniqueTableKey('exposure_analysis') as TableKey,
          title: data?.getTitle(t) || '',
          table: '',
          legendText: t(data?.legendText || ''),
        }),
      );
    };

    return (
      <>
        <FormGroup>
          <AnalysisFormControlLabel
            control={
              <Switch
                color="primary"
                disabled={hasNoData}
                checked={isDataTableDrawerActive}
                onChange={handleTableViewChange}
              />
            }
            label={t('Table View')}
          />
        </FormGroup>

        {hasNoData && (
          <Grid item>
            <Typography align="center" variant="h5">
              {t('No population was exposed')}
            </Typography>
          </Grid>
        )}
      </>
    );
  };

  if (!result || !(result instanceof ExposedPopulationResult)) {
    return (
      <>
        <AnalysisButton
          variant="contained"
          color="primary"
          size="small"
          onClick={runExposureAnalysis}
        >
          {t('Exposure Analysis')}
        </AnalysisButton>

        {analysisExposureLoading && <LinearProgress />}
      </>
    );
  }

  return (
    <>
      <AnalysisButton
        variant="contained"
        color="secondary"
        size="small"
        onClick={() => dispatch(clearAnalysisResult())}
      >
        {t('Clear Analysis')}
      </AnalysisButton>

      <ResultSwitches />
    </>
  );
};

interface AnalysisProps {
  result: ExposedPopulationResult;
  id: LayerType['id'];
  extent: Extent;
  exposure: ExposedPopulationDefinition;
}

export default ExposedPopulationAnalysis;
