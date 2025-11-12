import { Box, makeStyles } from '@material-ui/core';
import { useContext, useEffect } from 'react';
import DashboardContent from '../DashboardContent';
import DashboardExportContext, { PAPER_SIZES } from './dashboardExport.context';

function DashboardExportPreview() {
  const classes = useStyles();
  const { exportConfig } = useContext(DashboardExportContext);

  const fontScale = exportConfig?.fontScale ?? 0;
  const printRef = exportConfig?.printRef;

  // Apply font scaling when fontScale changes
  useEffect(() => {
    if (!printRef?.current) {
      return;
    }

    const container = printRef.current;
    const elements = container.querySelectorAll('*');

    // First, reset all inline font-size styles to get back to original CSS values
    elements.forEach(el => {
      if (el instanceof HTMLElement) {
        // eslint-disable-next-line no-param-reassign
        el.style.fontSize = '';
      }
    });

    // Then apply scaling if fontScale > 0 (not at 100%)
    if (fontScale > 0) {
      // Apply scaling: scaleFactor = 1 - fontScale (0.5 = 50%, 0.4 = 60%, etc.)
      const scaleFactor = 1 - fontScale;
      elements.forEach(el => {
        if (el instanceof HTMLElement) {
          const style = window.getComputedStyle(el);
          const fontSize = parseFloat(style.fontSize);
          if (!Number.isNaN(fontSize) && fontSize > 0) {
            // eslint-disable-next-line no-param-reassign
            el.style.fontSize = `${fontSize * scaleFactor}px`;
          }
        }
      });
    }
  }, [fontScale, printRef]);

  if (!exportConfig) {
    return null;
  }

  const {
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
