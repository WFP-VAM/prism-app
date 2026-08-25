import { Box, Typography } from '@mui/material';
import { ReactNode } from 'react';

import {
  blockPreviewDownloadActionsSx,
  blockPreviewHeaderSx,
  blockPreviewLeftColumnSx,
  blockPreviewSubtitleSx,
  blockPreviewTitleSx,
} from './blockPreviewHeaderStyles';

interface BlockPreviewHeaderProps {
  title: string;
  subtitle?: string;
  downloadActions?: ReactNode;
}

function BlockPreviewHeader({
  title, // Expects translated title
  subtitle, // Expects translated subtitle
  downloadActions,
}: BlockPreviewHeaderProps) {
  return (
    <Box sx={blockPreviewHeaderSx}>
      <Box sx={blockPreviewLeftColumnSx}>
        <Typography variant="h3" sx={blockPreviewTitleSx}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body1" sx={blockPreviewSubtitleSx}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {downloadActions && (
        <Box sx={blockPreviewDownloadActionsSx}>{downloadActions}</Box>
      )}
    </Box>
  );
}

export default BlockPreviewHeader;
