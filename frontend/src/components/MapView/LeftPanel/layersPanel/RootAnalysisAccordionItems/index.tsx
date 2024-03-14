import React, { memo } from 'react';
import { useSelector } from 'react-redux';
import {
  analysisResultOpacitySelector,
  analysisResultSelector,
  analysisResultSortByKeySelector,
  analysisResultSortOrderSelector,
} from 'context/analysisResultStateSlice';
import { useSafeTranslation } from 'i18n';
import AnalysisLayerMenuItem from '../AnalysisLayerMenuItem';

const RootAnalysisAccordionItems = () => {
  const analysisData = useSelector(analysisResultSelector);
  const analysisResultSortOrder = useSelector(analysisResultSortOrderSelector);
  const analysisResultSortByKey = useSelector(analysisResultSortByKeySelector);
  const analysisResultOpacity = useSelector(analysisResultOpacitySelector);
  const { t } = useSafeTranslation();

  if (!analysisData) {
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
};

export default memo(RootAnalysisAccordionItems);
