import { Box, useMediaQuery, useTheme } from '@material-ui/core';
import HashText from 'components/Common/HashText';
import { PanelSize } from 'config/types';
import { memo } from 'react';
import { isUniversalDeployment } from 'utils/universal-utils';

import BackToGlobalButton from './BackToGlobalButton';
import RootAccordionItems from './RootAccordionItems';
import RootAnalysisAccordionItems from './RootAnalysisAccordionItems';

const LayersPanel = memo(() => {
  const theme = useTheme();
  const smDown = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      style={{
        width: smDown ? '100%' : PanelSize.medium,
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
      {isUniversalDeployment() && <BackToGlobalButton />}
      <HashText />
    </Box>
  );
});

export default LayersPanel;
