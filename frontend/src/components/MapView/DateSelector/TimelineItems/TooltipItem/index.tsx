import { Box } from '@mui/material';
import { memo } from 'react';

import {
  tooltipItemColorSx,
  tooltipItemContainerSx,
} from '../timelineItemsStyles';

const TooltipItem = memo(({ layerTitle, color }: TooltipItemProps) => {
  return (
    <Box sx={tooltipItemContainerSx}>
      <Box
        sx={tooltipItemColorSx}
        style={{
          backgroundColor: color,
        }}
      />
      <Box>{layerTitle}</Box>
    </Box>
  );
});

interface TooltipItemProps {
  layerTitle: string;
  color: string;
}

export default TooltipItem;
