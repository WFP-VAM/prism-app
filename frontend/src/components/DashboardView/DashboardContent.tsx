import { Box, Typography, makeStyles } from '@material-ui/core';
import { useSelector } from 'react-redux';
import {
  dashboardTitleSelector,
  dashboardFlexElementsSelector,
  dashboardMapsSelector,
} from '../../context/dashboardStateSlice';
import {
  DashboardTextConfig,
  DashboardChartConfig,
  DashboardMode,
} from '../../config/types';
import MapBlock from './MapBlock';
import TextBlock from './TextBlock';
import TableBlock from './TableBlock';
import ChartBlock from './ChartBlock';

interface DashboardContentProps {
  /**
   * Whether to show the title section
   */
  showTitle?: boolean;
  /**
   * Custom class name for the root container
   */
  className?: string;
  /**
   * Key to force re-render of charts (e.g., when paper size changes)
   */
  refreshKey?: string;
}

/**
 * Shared component for rendering dashboard content in preview mode.
 * Used by both DashboardView (preview mode) and DashboardExportPreview.
 */
function DashboardContent({
  showTitle = true,
  className,
  refreshKey,
}: DashboardContentProps) {
  const classes = useStyles();
  const dashboardTitle = useSelector(dashboardTitleSelector);
  const dashboardFlexElements = useSelector(dashboardFlexElementsSelector);
  const dashboardMaps = useSelector(dashboardMapsSelector);

  return (
    <>
      {/* Dashboard Title */}
      {showTitle && (
        <Box className={classes.titleSection}>
          <Typography variant="h2" component="h1" className={classes.title}>
            {dashboardTitle || 'Untitled Dashboard'}
          </Typography>
        </Box>
      )}

      {/* Dashboard Layout */}
      <Box className={className || classes.layout}>
        {/* Maps */}
        <Box className={classes.leadingContentArea}>
          <div className={classes.mapsContainer}>
            {dashboardMaps.map((_, mapIndex) => (
              <Box
                // eslint-disable-next-line react/no-array-index-key
                key={`map-${mapIndex}`}
                className={classes.mapContainer}
              >
                <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
                  <MapBlock mapIndex={mapIndex} mode={DashboardMode.PREVIEW} />
                </div>
              </Box>
            ))}
          </div>
        </Box>

        {/* Flex Elements (Text, Tables, Charts) */}
        {dashboardFlexElements.length > 0 && (
          <Box className={classes.trailingContentArea}>
            {dashboardFlexElements?.map((element, index) => {
              if (element.type === 'TEXT') {
                const content = (element as DashboardTextConfig)?.content || '';
                return (
                  <TextBlock
                    // eslint-disable-next-line react/no-array-index-key
                    key={`text-block-${index}`}
                    content={content}
                    index={index}
                    mode={DashboardMode.PREVIEW}
                  />
                );
              }
              if (element.type === 'TABLE') {
                return (
                  <TableBlock
                    // eslint-disable-next-line react/no-array-index-key
                    key={`table-block-${index}`}
                    index={index}
                    startDate={element.startDate}
                    hazardLayerId={element.hazardLayerId}
                    baselineLayerId={element.baselineLayerId}
                    threshold={element.threshold}
                    stat={element.stat}
                    mode={DashboardMode.PREVIEW}
                  />
                );
              }
              if (element.type === 'CHART') {
                const chartElement = element as DashboardChartConfig;
                return (
                  <ChartBlock
                    // eslint-disable-next-line react/no-array-index-key
                    key={`chart-block-${index}-${refreshKey || 'default'}`}
                    index={index}
                    startDate={chartElement.startDate}
                    endDate={chartElement.endDate}
                    wmsLayerId={chartElement.wmsLayerId}
                    adminUnitLevel={chartElement.adminUnitLevel}
                    adminUnitId={chartElement.adminUnitId}
                    mode={DashboardMode.PREVIEW}
                  />
                );
              }
              return null;
            })}
          </Box>
        )}
      </Box>
    </>
  );
}

const useStyles = makeStyles(() => ({
  titleSection: {
    padding: 12,
    marginBottom: 0,
    backgroundColor: 'white',
  },
  title: {
    fontWeight: 500,
    fontSize: 18,
    margin: 0,
  },
  layout: {
    display: 'flex',
    padding: 12,
    gap: 12,
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  leadingContentArea: {
    flex: '2',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  trailingContentArea: {
    flex: '1',
    minWidth: 0,
    maxWidth: '100%',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflow: 'hidden',
  },
  mapsContainer: {
    display: 'flex',
    gap: '12px',
    width: '100%',
    flex: 1,
    minHeight: 0,
    '& > .MuiBox-root': {
      flex: 1,
      minWidth: 0,
      minHeight: 0,
    },
  },
  mapContainer: {
    background: 'white',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
}));

export default DashboardContent;
