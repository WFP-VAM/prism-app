import { Box } from '@material-ui/core';
import React, { memo } from 'react';
import { Extent } from 'components/MapView/Layers/raster-utils';
import RootAccordionItems from './RootAccordionItems';
import RootAnalysisAccordionItems from './RootAnalysisAccordionItems';

interface LayersPanelProps {
  extent?: Extent;
}

const LayersPanel = ({ extent }: LayersPanelProps) => (
  <Box>
    <RootAccordionItems extent={extent} />
    <RootAnalysisAccordionItems />
  </Box>
);

export default memo(LayersPanel);
