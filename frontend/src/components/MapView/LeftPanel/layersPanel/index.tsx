import { Box } from '@material-ui/core';
import React, { memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Extent } from 'components/MapView/Layers/raster-utils';
import { MenuItemType } from 'config/types';
import {
  analysisResultOpacitySelector,
  analysisResultSelector,
  analysisResultSortByKeySelector,
  analysisResultSortOrderSelector,
} from 'context/analysisResultStateSlice';
import { useSafeTranslation } from 'i18n';
import AnalysisLayerMenuItem from './AnalysisLayerMenuItem';
import MenuItem from './MenuItem';

const LayersPanel = memo(({ extent, layersMenuItems }: LayersPanelProps) => {
  const analysisData = useSelector(analysisResultSelector);
  const analysisResultSortOrder = useSelector(analysisResultSortOrderSelector);
  const analysisResultSortByKey = useSelector(analysisResultSortByKeySelector);
  const analysisResultOpacity = useSelector(analysisResultOpacitySelector);
  const { t } = useSafeTranslation();

  const renderedRootAccordionItems = useMemo(() => {
    return layersMenuItems.map((menuItem: MenuItemType) => {
      return (
        <MenuItem
          key={menuItem.title}
          title={menuItem.title}
          layersCategories={menuItem.layersCategories}
          icon={menuItem.icon}
          extent={extent}
        />
      );
    });
  }, [extent, layersMenuItems]);

  const renderedRootAnalysisAccordionItems = useMemo(() => {
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
  }, [
    analysisData,
    analysisResultOpacity,
    analysisResultSortByKey,
    analysisResultSortOrder,
    t,
  ]);

  return (
    <Box>
      {renderedRootAccordionItems}
      {renderedRootAnalysisAccordionItems}
    </Box>
  );
});

interface LayersPanelProps {
  extent?: Extent;
  layersMenuItems: MenuItemType[];
}

export default LayersPanel;
