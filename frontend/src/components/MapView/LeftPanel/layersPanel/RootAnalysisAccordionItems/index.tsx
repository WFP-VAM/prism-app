import { isAnticipatoryActionLayer } from 'config/utils';
import {
  analysisResultOpacitySelector,
  analysisResultSelector,
  analysisResultSortByKeySelector,
  analysisResultSortOrderSelector,
} from 'context/analysisResultStateSlice';
import { layersSelector } from 'context/mapStateSlice/selectors';
import { useSafeTranslation } from 'i18n';
import { memo } from 'react';
import { useSelector } from 'react-redux';

import AnalysisLayerMenuItem from '../AnalysisLayerMenuItem';

const RootAnalysisAccordionItems = memo(() => {
  const analysisData = useSelector(analysisResultSelector);
  const analysisResultSortOrder = useSelector(analysisResultSortOrderSelector);
  const analysisResultSortByKey = useSelector(analysisResultSortByKeySelector);
  const analysisResultOpacity = useSelector(analysisResultOpacitySelector);
  const selectedLayers = useSelector(layersSelector);
  const { t } = useSafeTranslation();

  const hasAnticipatoryActionLayer = selectedLayers.some(layer =>
    isAnticipatoryActionLayer(layer.type),
  );

  // Hide analysis results in the layers panel while an AA module is active.
  if (!analysisData || hasAnticipatoryActionLayer) {
    return null;
  }
  return (
    <AnalysisLayerMenuItem
      title={t('Analysis Results')}
      analysisResultSortByKey={analysisResultSortByKey}
      analysisResultSortOrder={analysisResultSortOrder}
      analysisData={analysisData}
      initialOpacity={analysisResultOpacity}
    />
  );
});
export default RootAnalysisAccordionItems;
