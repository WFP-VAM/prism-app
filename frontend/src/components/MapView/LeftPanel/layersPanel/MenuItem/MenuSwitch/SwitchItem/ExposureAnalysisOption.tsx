import { IconButton, Tooltip } from '@mui/material';
import { ImageAspectRatioOutlined } from '@mui/icons-material';
import { useDispatch, useSelector } from 'context/hooks';
import {
  AggregationOperations,
  ExposedPopulationDefinition,
  GeometryType,
  LayerType,
  Panel,
} from 'config/types';
import { ReportsDefinitions, TableKey } from 'config/utils';
import {
  analysisResultSelector,
  clearAnalysisResult,
  ExposedPopulationDispatchParams,
  requestAndStoreExposedPopulation,
  setCurrentDataDefinition,
  setExposureLayerId,
} from 'context/analysisResultStateSlice';
import { setTabValue } from 'context/leftPanelStateSlice';
import { dateRangeSelector } from 'context/mapStateSlice/selectors';
import { useSafeTranslation } from 'i18n';
import { Extent } from 'components/MapView/Layers/raster-utils';
import { generateUniqueTableKey } from 'components/MapView/utils';

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

  const foundReports = Object.keys(ReportsDefinitions).filter(
    reportDefinitionKey =>
      ReportsDefinitions[reportDefinitionKey].layerId === layer.id,
  );
  if (!exposure || !foundReports.length) {
    return null;
  }

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

    // Set the exposure layer id in redux so that we can have access to the reports configurations through the layer id
    dispatch(setExposureLayerId(layer.id));

    dispatch(requestAndStoreExposedPopulation(params));
    dispatch(
      setCurrentDataDefinition({
        id: generateUniqueTableKey('exposure_analysis') as TableKey,
        title: analysisResult?.getTitle(t) || '',
        table: '',
        legendText: t(analysisResult?.legendText || ''),
      }),
    );
    dispatch(setTabValue(Panel.Analysis));
  };

  return (
    <Tooltip title={t('Exposure Analysis') ?? ''}>
      <span>
        <IconButton
          id={layer.id}
          aria-label="Exposure Analysis"
          disabled={!selected}
          onClick={handleExposureAnalysis}
        >
          <ImageAspectRatioOutlined />
        </IconButton>
      </span>
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
