import { Box } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { useContext } from 'react';
import DashboardContent from '../DashboardContent';
import DashboardExportContext, { PAPER_SIZES } from './dashboardExport.context';

function DashboardExportPreview() {
  const classes = useStyles();
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
    <Box className={classes.previewContainer}>
      <Box className={classes.previewWrapper}>
        <div
          ref={printRef}
          className={classes.exportContent}
          style={containerStyle}
        >
          <DashboardContent
            showTitle
            logoConfig={logoConfig}
            exportConfig={exportConfigForContent}
          />
        </div>
      </Box>
    </Box>
  );
}

const useStyles = makeStyles(() => ({
  previewContainer: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    overflow: 'auto',
    backgroundColor: '#E0E0E0',
  },
  previewWrapper: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: 24,
    minHeight: '100%',
    minWidth: 'fit-content',
    boxSizing: 'border-box',
  },
  exportContent: {
    backgroundColor: '#F8F8F8',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
  },
}));

export default DashboardExportPreview;
