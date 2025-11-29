import { Box } from '@mui/material';
import { memo } from 'react';
import HashText from 'components/Common/HashText';
import { PanelSize } from 'config/types';
import RootAccordionItems from './RootAccordionItems';
import RootAnalysisAccordionItems from './RootAnalysisAccordionItems';

const LayersPanel = memo(() => (
  <Box
    style={{
      width: PanelSize.medium,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}
  >
    <div style={{ padding: '0.5rem' }}>
      <RootAccordionItems />
      <RootAnalysisAccordionItems />
    </div>
    <Box
      style={{
        flexGrow: 1,
      }}
    />
    <HashText />
  </Box>
));

export default LayersPanel;
