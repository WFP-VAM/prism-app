import { Box } from '@material-ui/core';
import React, { memo } from 'react';
import HashText from 'components/Common/HashText';
import RootAccordionItems from './RootAccordionItems';
import RootAnalysisAccordionItems from './RootAnalysisAccordionItems';

const LayersPanel = () => {
  return (
    <Box display="flex" flexDirection="column" height="100%">
      <RootAccordionItems />
      <RootAnalysisAccordionItems />
      <Box flexGrow={1} />
      <HashText />
    </Box>
  );
};

export default memo(LayersPanel);
