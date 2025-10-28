import {
  Box,
  FormControlLabel,
  Switch,
  Typography,
  makeStyles,
} from '@material-ui/core';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeTranslation } from 'i18n';
import {
  dashboardConfigSelector,
  dashboardColumnsSelector,
  dashboardMapElementsSelector,
  dashboardModeSelector,
  setTitle,
  toggleMapSync,
  dashboardSyncEnabledSelector,
} from '../../context/dashboardStateSlice';
import {
  DashboardMode,
  AdminCodeString,
  DashboardElementType,
  DashboardElements,
} from '../../config/types';
import { appConfig } from '../../config';
import MapBlock from './MapBlock';
import TextBlock from './TextBlock';
import TableBlock from './TableBlock';
import ChartBlock from './ChartBlock';

interface LogoConfig {
  visible: boolean;
  position: number; // 0 = left, 1 = right
  scale: number; // 0.5 = small, 1 = medium, 1.5 = large
}

export interface ExportConfig {
  toggles?: {
    legendVisibility?: boolean;
    mapLabelsVisibility?: boolean;
    adminAreasVisibility?: boolean;
  };
  legendPosition?: number;
  legendScale?: number;
  selectedBoundaries?: AdminCodeString[];
  invertedAdminBoundaryLimitPolygon?: any;
}

interface DashboardContentProps {
  showTitle?: boolean;
  className?: string;
  logoConfig?: LogoConfig;
  exportConfig?: ExportConfig;
}

/**
 * Shared component for rendering dashboard content in preview mode.
 * Used by both DashboardView (preview mode) and DashboardExportPreview.
 */
function DashboardContent({
  showTitle = true,
  className,
  logoConfig,
  exportConfig,
}: DashboardContentProps) {
  const classes = useStyles();
  const dashboardConfig = useSelector(dashboardConfigSelector);
  const { title: dashboardTitle } = dashboardConfig;

  const { logo } = appConfig.header || {};
  const logoHeightMultiplier = 32;
  const logoHeight = logoConfig ? logoHeightMultiplier * logoConfig.scale : 0;
  const columns = useSelector(dashboardColumnsSelector);
  const mapElements = useSelector(dashboardMapElementsSelector);
  const mode = useSelector(dashboardModeSelector);
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();
  const syncEnabled = useSelector(dashboardSyncEnabledSelector);
  const renderElement = (
    element: DashboardElements,
    columnIndex: number,
    elementIndex: number,
  ) => {
    const elementId = `${columnIndex}-${elementIndex}`;

    switch (element.type) {
      case DashboardElementType.MAP:
        return (
          <Box
            key={`map-${elementId}`}
            className={
              mode === DashboardMode.PREVIEW
                ? classes.previewContainer
                : classes.grayCard
            }
          >
            {mode === 'edit' && (
              <div className={classes.mapHeaderContainer}>
                <Typography
                  variant="h3"
                  component="h3"
                  className={classes.blockLabel}
                >
                  {mapElements.length > 1
                    ? `Map ${elementIndex + 1}`
                    : 'Map block'}{' '}
                  — {t('Choose map layers')}
                </Typography>
              </div>
            )}
            <div style={{ height: '700px' }}>
              <MapBlock elementId={elementId} exportConfig={exportConfig} />
            </div>
          </Box>
        );
      case DashboardElementType.TEXT:
        return (
          <TextBlock
            key={`text-${elementId}`}
            content={element.content || ''}
            columnIndex={columnIndex}
            elementIndex={elementIndex}
          />
        );
      case DashboardElementType.TABLE:
        return (
          <TableBlock
            key={`table-${elementId}`}
            index={elementIndex}
            startDate={element.startDate}
            hazardLayerId={element.hazardLayerId}
            baselineLayerId={element.baselineLayerId}
            threshold={element.threshold}
            stat={element.stat}
            allowDownload={!exportConfig}
          />
        );
      case DashboardElementType.CHART:
        return (
          <ChartBlock
            key={`chart-${elementId}`}
            index={elementIndex}
            startDate={element.startDate}
            endDate={element.endDate}
            wmsLayerId={element.wmsLayerId}
            adminUnitLevel={element.adminUnitLevel}
            adminUnitId={element.adminUnitId}
            chartHeight={element.chartHeight}
            allowDownload={!exportConfig}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box className={classes.root}>
      {showTitle && (
        <Box className={classes.titleSection}>
          {logoConfig?.visible && logo && (
            <img
              style={{
                position: 'absolute',
                zIndex: 2,
                height: logoHeight,
                left: logoConfig.position % 2 === 0 ? '12px' : 'auto',
                right: logoConfig.position % 2 === 0 ? 'auto' : '12px',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
              src={logo}
              alt="logo"
            />
          )}
          {mode !== DashboardMode.EDIT ? (
            <Typography variant="h2" component="h1" className={classes.title}>
              {dashboardTitle || 'Untitled Dashboard'}
            </Typography>
          ) : (
            <Box className={classes.grayCard}>
              <label className={classes.titleBarLabel}>
                <Typography
                  variant="h2"
                  component="span"
                  className={classes.titleBarTypography}
                >
                  {t('Dashboard title')}
                </Typography>
                <input
                  type="text"
                  className={classes.titleBarInput}
                  placeholder={t('Enter dashboard title')}
                  value={dashboardTitle}
                  onChange={e => dispatch(setTitle(e.target.value))}
                  name="dashboard-title"
                />
              </label>
            </Box>
          )}
          {mode === DashboardMode.EDIT && mapElements.length > 1 && (
            <FormControlLabel
              control={
                <Switch
                  checked={syncEnabled}
                  onChange={() => dispatch(toggleMapSync())}
                  color="primary"
                  size="medium"
                />
              }
              label={t('Sync maps')}
              className={classes.syncToggle}
            />
          )}
        </Box>
      )}

      <Box className={className || classes.layout}>
        {columns.length > 0 && (
          <Box
            className={
              mode === 'preview'
                ? classes.dynamicColumnPreviewLayout
                : classes.dynamicColumnLayout
            }
          >
            {columns.map((column, columnIndex) => {
              const hasMapElements = column.some(
                el => el.type === DashboardElementType.MAP,
              );
              const columnClass = hasMapElements
                ? classes.mapColumn
                : classes.contentColumn;

              return (
                // eslint-disable-next-line react/no-array-index-key
                <Box key={`column-${columnIndex}`} className={columnClass}>
                  {column.map((element, elementIndex) =>
                    renderElement(element, columnIndex, elementIndex),
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}

const useStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    height: '100%',
    maxHeight: '100%',
  },
  blockLabel: {
    fontWeight: 600,
    fontSize: 16,
    marginBottom: 12,
  },
  contentColumn: {
    flex: 1, // Smaller for columns without maps
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minWidth: 0,
  },
  dynamicColumnLayout: {
    display: 'flex',
    padding: 16,
    margin: '0 16px 16px 16px',
    gap: 16,
    flex: 1,
    overflow: 'auto',
    paddingBottom: 80, // Add extra padding to account for fixed toolbar
  },
  dynamicColumnPreviewLayout: {
    display: 'flex',
    padding: 16,
    margin: 16,
    gap: 16,
    flex: 1,
    overflow: 'auto',
  },
  previewContainer: {
    background: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  grayCard: {
    background: '#F1F1F1',
    borderRadius: 8,
    marginBottom: 16,
    padding: 12,
    flex: 1,
  },
  mapHeaderContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleSection: {
    position: 'relative',
    padding: 12,
    marginBottom: 0,
    backgroundColor: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    maxHeight: '100%',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  leadingContentArea: {
    flex: '2',
    minWidth: 0,
    minHeight: 0,
    maxHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'stretch',
  },
  trailingContentArea: {
    flex: '1',
    minWidth: 0,
    maxWidth: '100%',
    width: '100%',
    flexDirection: 'column',
    gap: 12,
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
  mapColumn: {
    flex: '2',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    minWidth: 0,
  },
  mapColumnFlexElements: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  mapContainer: {
    background: 'white',
    borderRadius: 8,
    padding: 16,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  syncToggle: {
    margin: 0,
    '& .MuiFormControlLabel-label': {
      fontSize: '12px',
      fontWeight: 500,
    },
    '& .MuiSwitch-root': {
      marginRight: 4,
    },
  },
  titleBarLabel: {
    display: 'flex',
    alignItems: 'center',
    marginRight: 16,
    fontWeight: 600,
    fontSize: 16,
    flex: 1,
  },
  titleBarTypography: {
    flex: '1 0 fit-content',
    marginInlineEnd: 16,
  },
  titleBarInput: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 4,
    fontSize: 16,
    border: 'none',
    outline: 'none',
    background: 'white',
    fontFamily: 'Roboto',
  },
}));

export default DashboardContent;
