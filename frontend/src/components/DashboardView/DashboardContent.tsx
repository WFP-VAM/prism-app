import {
  Box,
  FormControlLabel,
  Switch,
  Typography,
  makeStyles,
  Button,
} from '@material-ui/core';
import { Edit } from '@material-ui/icons';
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
  ChartHeight,
} from '../../config/types';
import { appConfig } from '../../config';
import MapBlock from './MapBlock';
import TextBlock from './TextBlock';
import TableBlock from './TableBlock';
import ChartBlock from './ChartBlock';
import { useColumnHeightManagement, GAP } from './useColumnHeightManagement';
import { CHART_HEIGHTS } from './chartConstants';

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
  isEditable?: boolean;
  onEditClick?: () => void;
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
  isEditable,
  onEditClick,
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

  // Column Height Management - extracted to custom hook
  const { componentHeights, columnRefs, componentRefs, recalculationCount } =
    useColumnHeightManagement({
      mode,
      exportConfig,
      columns,
    });

  const renderElement = (
    element: DashboardElements,
    columnIndex: number,
    elementIndex: number,
  ) => {
    const elementId = `${columnIndex}-${elementIndex}`;
    const heightConfig = componentHeights.get(elementId);

    // Common wrapper style for non-map elements
    const getWrapperStyle = () => {
      if (mode === DashboardMode.EDIT || !heightConfig) {
        return undefined;
      }

      return {
        flex: heightConfig.flex,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column' as const,
        overflow: heightConfig.overflow,
      };
    };

    // Common ref handler
    const handleRef = (el: HTMLDivElement | null) => {
      if (el) {
        componentRefs.current.set(elementId, el);
      } else {
        componentRefs.current.delete(elementId);
      }
    };

    switch (element.type) {
      case DashboardElementType.MAP:
        return (
          <Box
            key={`map-${elementId}`}
            className={
              mode === DashboardMode.VIEW
                ? classes.previewContainer
                : classes.grayCard
            }
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
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
            <div style={{ height: '100%', flex: 1, minHeight: 0 }}>
              <MapBlock elementId={elementId} exportConfig={exportConfig} />
            </div>
          </Box>
        );
      case DashboardElementType.TEXT:
        return (
          <div
            key={`text-${elementId}`}
            ref={handleRef}
            style={getWrapperStyle()}
          >
            <TextBlock
              content={element.content || ''}
              columnIndex={columnIndex}
              elementIndex={elementIndex}
            />
          </div>
        );
      case DashboardElementType.TABLE:
        return (
          <div
            key={`table-${elementId}`}
            ref={handleRef}
            style={getWrapperStyle()}
          >
            <TableBlock
              index={elementIndex}
              columnIndex={columnIndex}
              elementIndex={elementIndex}
              startDate={element.startDate}
              hazardLayerId={element.hazardLayerId}
              baselineLayerId={element.baselineLayerId}
              threshold={element.threshold}
              stat={element.stat}
              maxRows={element.maxRows}
              allowDownload={!exportConfig}
              addResultToMap={element.addResultToMap}
              sortColumn={element.sortColumn}
              sortOrder={element.sortOrder}
            />
          </div>
        );
      case DashboardElementType.CHART: {
        // Calculate intended height: chart height + padding + header + margins
        const chartHeight = element.chartHeight || ChartHeight.TALL;
        const intendedHeight = CHART_HEIGHTS[chartHeight] + 100;

        return (
          <div
            key={`chart-${elementId}`}
            ref={handleRef}
            style={getWrapperStyle()}
            data-intended-height={intendedHeight}
          >
            <ChartBlock
              index={elementIndex}
              startDate={element.startDate}
              endDate={element.endDate}
              layerId={element.layerId}
              adminUnitLevel={element.adminUnitLevel}
              adminUnitId={element.adminUnitId}
              chartHeight={element.chartHeight}
              allowDownload={!exportConfig}
              isOverflowing={heightConfig?.overflow === 'auto'}
              recalculationCount={recalculationCount}
            />
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <Box className={classes.root}>
      <Box
        className={className || classes.layout}
        style={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {showTitle && (
          <Box
            className={
              mode === DashboardMode.EDIT
                ? classes.titleSectionEdit
                : classes.titleSection
            }
          >
            {mode !== DashboardMode.EDIT ? (
              <>
                {logoConfig?.visible && logo && (
                  <img
                    className={classes.logo}
                    style={{
                      height: logoHeight,
                    }}
                    src={logo}
                    alt="logo"
                  />
                )}
                <Typography
                  variant="h2"
                  component="h1"
                  className={classes.title}
                >
                  {t(dashboardTitle || 'Untitled Dashboard')}
                </Typography>
                {mode === DashboardMode.VIEW && (
                  <Box className={classes.titleActions}>
                    {isEditable && onEditClick && (
                      <Button
                        color="primary"
                        variant="outlined"
                        disableElevation
                        startIcon={<Edit />}
                        onClick={onEditClick}
                        size="medium"
                      >
                        {t('Edit')}
                      </Button>
                    )}
                  </Box>
                )}
              </>
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
        {columns.length > 0 && (
          <Box
            className={
              mode !== DashboardMode.EDIT
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
                <Box
                  // eslint-disable-next-line react/no-array-index-key
                  key={`column-${columnIndex}`}
                  className={columnClass}
                  component="div"
                >
                  <div
                    ref={(el: HTMLDivElement | null) => {
                      if (el) {
                        columnRefs.current.set(columnIndex, el);
                      } else {
                        columnRefs.current.delete(columnIndex);
                      }
                    }}
                    style={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                    }}
                  >
                    {column.map((element, elementIndex) =>
                      renderElement(element, columnIndex, elementIndex),
                    )}
                  </div>
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
    gap: GAP,
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
  },
  dynamicColumnLayout: {
    display: 'flex',
    padding: 16,
    margin: '0 16px 16px 16px',
    gap: GAP,
    flex: 1,
    overflow: 'auto',
    paddingBottom: 80, // Add extra padding to account for fixed toolbar
  },
  dynamicColumnPreviewLayout: {
    display: 'flex',
    padding: 0,
    margin: 0,
    gap: GAP,
    flex: 1,
    overflow: 'hidden',
    minHeight: 0,
  },
  previewContainer: {
    background: 'white',
    borderRadius: 8,
    padding: 16,
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
    display: 'flex',
    margin: '16px 0',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: GAP,
    flexWrap: 'wrap',
  },
  titleSectionEdit: {
    display: 'flex',
    padding: 16,
    margin: '16px 16px -48px 16px',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: GAP,
    flexWrap: 'wrap',
  },
  logo: {
    flexShrink: 0,
    objectFit: 'contain',
  },
  title: {
    fontWeight: 'bold',
    fontSize: 24,
    margin: 0,
    flex: '1 1 auto',
    minWidth: 0,
  },
  titleActions: {
    display: 'flex',
    gap: '12px',
    flexShrink: 0,
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
    minHeight: 0,
    overflow: 'hidden',
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
