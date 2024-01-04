import { Box } from '@material-ui/core';
import React, { memo } from 'react';
import HashText from 'components/Common/HashText';
import { Extent } from 'components/MapView/Layers/raster-utils';
import RootAccordionItems from './RootAccordionItems';
import RootAnalysisAccordionItems from './RootAnalysisAccordionItems';

interface LayersPanelProps {
  extent?: Extent;
}

const LayersPanel = ({ extent }: LayersPanelProps) => (
  <Box display="flex" flexDirection="column" height="100%">
    <RootAccordionItems extent={extent} />
    <RootAnalysisAccordionItems />
    <Box flexGrow={1} />
    <HashText />
  </Box>
);

export default memo(LayersPanel);
