import { Box } from '@mui/material';
import { memo, useMemo } from 'react';
import useLayers from 'utils/layers-utils';

import BoundaryInfoBox from '../BoundaryInfoBox';
import DateSelector from '../DateSelector';

const OtherFeatures = memo(() => {
  const { selectedLayersWithDateSupport } = useLayers();

  const showBoundaryInfo = useMemo(
    () => JSON.parse(process.env.REACT_APP_SHOW_MAP_INFO || 'false'),
    [],
  );

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        position: 'absolute',
        top: 0,
        right: 0,
        /* Full-viewport shell must not eat clicks meant for LeftPanel / map — restore hits only on children. */
        pointerEvents: 'none',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          pointerEvents: 'none',
        }}
      >
        {selectedLayersWithDateSupport.length > 0 && (
          <Box style={{ pointerEvents: 'auto' }}>
            <DateSelector />
          </Box>
        )}
        {showBoundaryInfo && (
          <Box style={{ pointerEvents: 'auto' }}>
            <BoundaryInfoBox />
          </Box>
        )}
      </Box>
    </Box>
  );
});

export default OtherFeatures;
