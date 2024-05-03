import { Box } from '@material-ui/core';
import React, { memo } from 'react';
import HashText from 'components/Common/HashText';
import { PanelSize } from 'config/types';
import RootAccordionItems from './RootAccordionItems';
import RootAnalysisAccordionItems from './RootAnalysisAccordionItems';

function LayersPanel() {
  return (
    <Box
      display="flex"
      width={PanelSize.medium}
      flexDirection="column"
      height="100%"
    >
      <div style={{ padding: '0.5rem' }}>
        <RootAccordionItems />
        <RootAnalysisAccordionItems />
      </div>
      <Box flexGrow={1} />
      <HashText />
    </Box>
  );
}

export default memo(LayersPanel);
