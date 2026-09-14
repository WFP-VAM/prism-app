import { Box } from '@mui/material';
import { useContext } from 'react';

import DashboardContent from '../DashboardContent';
import DashboardExportContext, { PAPER_SIZES } from './dashboardExport.context';
import {
  dashboardExportContentSx,
  dashboardExportPreviewContainerSx,
  dashboardExportPreviewWrapperSx,
} from './dashboardExportStyles';

function DashboardExportPreview() {
  const { exportConfig } = useContext(DashboardExportContext);

  if (!exportConfig) {
    return null;
  }

  const {
    printRef,
    paperSize,
    toggles,
    logoPosition,
    logoScale,
    legendPosition,
    legendScale,
    selectedBoundaries,
    invertedAdminBoundaryLimitPolygon,
  } = exportConfig;

  const dimensions = PAPER_SIZES[paperSize];

  // A4 container style with overflow hidden to cut off content
  const containerStyle = {
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
    overflow: 'hidden',
    flexShrink: 0,
  };

  const logoConfig = {
    visible: toggles.logoVisibility,
    position: logoPosition,
    scale: logoScale,
  };

  const exportConfigForContent = {
    toggles: {
      legendVisibility: toggles.legendVisibility,
      mapLabelsVisibility: toggles.mapLabelsVisibility,
      adminAreasVisibility: toggles.adminAreasVisibility,
    },
    legendPosition,
    legendScale,
    selectedBoundaries,
    invertedAdminBoundaryLimitPolygon,
  };

  return (
    <Box sx={dashboardExportPreviewContainerSx}>
      <Box sx={dashboardExportPreviewWrapperSx}>
        <Box
          ref={printRef}
          sx={dashboardExportContentSx}
          style={containerStyle}
        >
          <DashboardContent
            showTitle
            logoConfig={logoConfig}
            exportConfig={exportConfigForContent}
          />
        </Box>
      </Box>
    </Box>
  );
}

export default DashboardExportPreview;
