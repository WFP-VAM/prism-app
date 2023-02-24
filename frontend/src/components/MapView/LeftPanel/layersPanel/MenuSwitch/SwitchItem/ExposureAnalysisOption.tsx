import { IconButton, Tooltip } from '@material-ui/core';
import { ImageAspectRatioOutlined } from '@material-ui/icons';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  AggregationOperations,
  ExposedPopulationDefinition,
  GeometryType,
  LayerType,
} from '../../../../../../config/types';
import { TableKey } from '../../../../../../config/utils';
import {
  analysisResultSelector,
  clearAnalysisResult,
  ExposedPopulationDispatchParams,
  requestAndStoreExposedPopulation,
  setCurrentDataDefinition,
} from '../../../../../../context/analysisResultStateSlice';
import { setTabValue } from '../../../../../../context/leftPanelStateSlice';
import { dateRangeSelector } from '../../../../../../context/mapStateSlice/selectors';
import { useSafeTranslation } from '../../../../../../i18n';
import { Extent } from '../../../../Layers/raster-utils';
import { generateUniqueTableKey } from '../../../../utils';

function ExposureAnalysisOption({
  layer,
  extent,
  selected,
  exposure,
}: ExposureAnalysisOptionProps) {
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();
  const analysisResult = useSelector(analysisResultSelector);
  const { startDate: selectedDate } = useSelector(dateRangeSelector);

  const handleExposureAnalysis = () => {
    if (analysisResult) {
      dispatch(clearAnalysisResult());
    }

    if (!layer.id || !extent || !exposure) {
      return;
    }

    if (!selectedDate) {
      throw new Error('Date must be given to run analysis');
    }

    const hazardLayer =
      layer.type === 'wms' && layer.geometry === GeometryType.Polygon
        ? { wfsLayerId: layer.id }
        : { maskLayerId: layer.id };

    const params: ExposedPopulationDispatchParams = {
      exposure,
      date: selectedDate,
      statistic: AggregationOperations.Sum,
      extent,
      ...hazardLayer,
    };

    dispatch(requestAndStoreExposedPopulation(params));
    dispatch(
      setCurrentDataDefinition({
        id: generateUniqueTableKey('exposure_analysis') as TableKey,
        title: analysisResult?.getTitle(t) || '',
        table: '',
        legendText: t(analysisResult?.legendText || ''),
      }),
    );
    // TODO: maybe we could use an enum here instead of 2
    dispatch(setTabValue(2));
  };

  return (
    <Tooltip title={t('Exposure Analysis') ?? ''}>
      <IconButton disabled={!selected} onClick={handleExposureAnalysis}>
        <ImageAspectRatioOutlined />
      </IconButton>
    </Tooltip>
  );
}

interface ExposureAnalysisOptionProps {
  layer: LayerType;
  extent: Extent | undefined;
  selected: boolean;
  exposure: ExposedPopulationDefinition | undefined;
}

export default ExposureAnalysisOption;
