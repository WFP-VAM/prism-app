import React from 'react';
import { useSelector, useDispatch } from 'react-redux';

import {
  Button,
  withStyles,
  LinearProgress,
  Switch,
  FormGroup,
  FormControlLabel,
} from '@material-ui/core';
import {
  ExposedPopulationResult,
  BaselineLayerResult,
} from '../../../utils/analysis-utils';
import { dateRangeSelector } from '../../../context/mapStateSlice/selectors';
import {
  isAnalysisLayerActiveSelector,
  ExposedPopulationDispatchParams,
  requestAndStoreExposedPopulation,
  isExposureAnalysisLoadingSelector,
  clearAnalysisResult,
  setIsMapLayerActive,
} from '../../../context/analysisResultStateSlice';
import {
  LayerType,
  AggregationOperations,
  LayerKey,
  ExposedPopulationDefinition,
} from '../../../config/types';

import { Extent } from '../Layers/raster-utils';

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
  const isMapLayerActive = useSelector(isAnalysisLayerActiveSelector);

  const analysisExposureLoading = useSelector(
    isExposureAnalysisLoadingSelector,
  );

  const dispatch = useDispatch();

  const runExposureAnalysis = async () => {
    if (!id || !extent || !exposure) {
      return;
    }

    if (!selectedDate) {
      throw new Error('Date must be given to run analysis');
    }

    const params: ExposedPopulationDispatchParams = {
      exposure,
      date: selectedDate,
      statistic: AggregationOperations.Sum,
      extent,
      wfsLayerId: id as LayerKey,
    };

    await dispatch(requestAndStoreExposedPopulation(params));
  };

  const ResultSwitches = () => (
    <FormGroup>
      <AnalysisFormControlLabel
        control={
          <Switch
            color="primary"
            checked={isMapLayerActive}
            onChange={e => dispatch(setIsMapLayerActive(e.target.checked))}
          />
        }
        label="Map View"
      />
    </FormGroup>
  );

  if (!result || result instanceof BaselineLayerResult) {
    return (
      <>
        <AnalysisButton
          variant="contained"
          color="primary"
          size="small"
          onClick={runExposureAnalysis}
        >
          Exposure Analysis
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
        clear analysis
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
