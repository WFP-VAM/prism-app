import { Box, makeStyles } from '@material-ui/core';
import { useContext } from 'react';
import DashboardContent from '../DashboardContent';
import DashboardExportContext, {
  PaperSize,
  PAPER_SIZES,
} from './dashboardExport.context';

function DashboardExportPreview() {
  const classes = useStyles();
  const { exportConfig } = useContext(DashboardExportContext);

  if (!exportConfig) {
    return null;
  }

  const { printRef, paperSize, toggles, logoPosition, logoScale } =
    exportConfig;

  const dimensions = PAPER_SIZES[paperSize];
  const useBrowserSize = paperSize === PaperSize.BROWSER;

  // Container style adapted for paper sizes
  const containerStyle = useBrowserSize
    ? {
        flex: 1,
        minHeight: '100%',
        height: '100%',
        width: '100%',
      }
    : {
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
            refreshKey={paperSize}
            logoConfig={logoConfig}
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
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: 24,
    minHeight: '100%',
    width: '100%',
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
