import { Box } from '@mui/material';
import { memo, ReactNode } from 'react';

import { chartsContainerSx, chartsSx } from '../mapTooltipStyles';

interface PopupChartWrapperProps {
  children: ReactNode;
}

const PopupChartWrapper = memo(({ children }: PopupChartWrapperProps) => {
  return (
    <Box sx={chartsContainerSx}>
      <Box sx={chartsSx}>{children}</Box>
    </Box>
  );
});

export default PopupChartWrapper;
