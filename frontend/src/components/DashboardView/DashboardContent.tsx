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
import { useEffect, useRef, useState } from 'react';
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
  isEditable?: boolean;
  onEditClick?: () => void;
}

const GAP = 16;

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

  // Column Height Management with dynamic redistribution
  // Logic:
  // 1. If components fit naturally, use natural heights
  // 2. If components overflow, distribute space intelligently:
  //    - Components needing less than equal share get their natural height
  //    - Unused space is redistributed to larger components
  //    - Only overflowing components get scroll
  const [componentHeights, setComponentHeights] = useState<
    Map<string, { flex: string; overflow: 'auto' | 'visible' }>
  >(new Map());
  const columnRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const componentRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousHeightsRef = useRef<
    Map<string, { flex: string; overflow: 'auto' | 'visible' }>
  >(new Map());

  // Calculate dynamic component heights based on content and available space
  useEffect(() => {
    if (mode === DashboardMode.EDIT || columns.length === 0) {
      setComponentHeights(new Map());
      previousHeightsRef.current = new Map();
      return;
    }

    const calculateHeights = () => {
      const newHeights = new Map<
        string,
        { flex: string; overflow: 'auto' | 'visible' }
      >();

      columnRefs.current.forEach((columnElement, columnIndex) => {
        const column = columns?.[columnIndex];
        // Single component (including maps) takes natural height
        if (!column || column.length <= 1) {
          return;
        }

        const columnHeight = columnElement.clientHeight;
        const availableHeight = columnHeight - GAP * (column.length - 1);

        // Measure natural heights of all components in this column
        const tempComponentHeights: Array<{
          id: string;
          naturalHeight: number;
        }> = [];

        let totalNaturalHeight = 0;

        column.forEach((_, elementIndex) => {
          const componentId = `${columnIndex}-${elementIndex}`;
          const componentElement = componentRefs.current.get(componentId);

          if (componentElement) {
            // Temporarily remove constraints to get true natural height
            const currentStyle = componentElement.style.cssText;
            componentElement.style.flex = ''; // eslint-disable-line fp/no-mutation
            componentElement.style.overflow = ''; // eslint-disable-line fp/no-mutation
            componentElement.style.minHeight = ''; // eslint-disable-line fp/no-mutation
            const naturalHeight = componentElement.scrollHeight;

            // Restore original styles
            // eslint-disable-next-line fp/no-mutation
            componentElement.style.cssText = currentStyle;

            // eslint-disable-next-line fp/no-mutating-methods
            tempComponentHeights.push({
              id: componentId,
              naturalHeight,
            });
            // eslint-disable-next-line fp/no-mutation
            totalNaturalHeight += naturalHeight;
          }
        });

        // If total natural height fits, let components use natural heights
        if (totalNaturalHeight <= availableHeight) {
          return;
        }

        // COMPONENTS EXCEED COLUMN HEIGHT - apply distribution logic
        const numComponents = column.length;
        const equalShare = availableHeight / numComponents;

        // First pass: identify which components need less than equal share
        const smallComponents: Array<{ id: string; height: number }> = [];
        const largeComponents: Array<{ id: string; height: number }> = [];
        let unusedSpace = 0;

        tempComponentHeights.forEach(({ id, naturalHeight }) => {
          if (naturalHeight <= equalShare) {
            // eslint-disable-next-line fp/no-mutating-methods
            smallComponents.push({ id, height: naturalHeight });
            // eslint-disable-next-line fp/no-mutation
            unusedSpace += equalShare - naturalHeight;
          } else {
            // eslint-disable-next-line fp/no-mutating-methods
            largeComponents.push({ id, height: naturalHeight });
          }
        });

        const redistributedHeight =
          largeComponents.length > 0
            ? equalShare + unusedSpace / largeComponents.length
            : equalShare;

        // Set flex values for each component
        tempComponentHeights.forEach(({ id, naturalHeight }) => {
          if (naturalHeight <= equalShare) {
            // Small component: use natural height (no scroll)
            const flexBasis = `${naturalHeight}px`;
            newHeights.set(id, {
              flex: `0 0 ${flexBasis}`,
              overflow: 'visible',
            });
          } else {
            // Large component: use redistributed height (with scroll)
            const flexBasis = `${redistributedHeight}px`;
            newHeights.set(id, {
              flex: `0 0 ${flexBasis}`,
              overflow: 'auto',
            });
          }
        });
      });

      const prevHeights = previousHeightsRef.current;

      // Helper to extract numeric value from flex string (e.g., "0 0 500px" -> 500)
      const getFlexBasis = (flexStr: string): number => {
        const match = flexStr.match(/(\d+(?:\.\d+)?)px/);
        return match ? parseFloat(match[1]) : 0;
      };

      // Check if heights meaningfully changed
      const threshold = 5;
      const hasChanged =
        newHeights.size !== prevHeights.size ||
        Array.from(newHeights.entries()).some(([id, config]) => {
          const oldConfig = prevHeights.get(id);
          if (!oldConfig) {
            return true;
          }
          if (oldConfig.overflow !== config.overflow) {
            return true;
          }
          // Compare flex-basis values with threshold
          const oldBasis = getFlexBasis(oldConfig.flex);
          const newBasis = getFlexBasis(config.flex);
          return Math.abs(oldBasis - newBasis) > threshold;
        });

      if (hasChanged) {
        previousHeightsRef.current = newHeights;
        setComponentHeights(newHeights);
      }
    };

    const debouncedCheck = () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
      checkTimeoutRef.current = setTimeout(calculateHeights, 100);
    };

    // Initial checks with multiple delays to catch async content loading
    const timeoutIds: NodeJS.Timeout[] = [];
    [100, 500, 1000].forEach(delay => {
      const timeoutId = setTimeout(calculateHeights, delay);
      // eslint-disable-next-line fp/no-mutating-methods
      timeoutIds.push(timeoutId);
    });

    // Observe COLUMNS for resize events (skip map columns)
    const observers: ResizeObserver[] = [];
    columnRefs.current.forEach((element, columnIndex) => {
      if (!element) {
        return;
      }
      const column = columns[columnIndex];
      if (!column || column.length <= 1) {
        return;
      }
      const observer = new ResizeObserver(debouncedCheck);
      observer.observe(element);
      // eslint-disable-next-line fp/no-mutating-methods
      observers.push(observer);
    });

    // Observe COMPONENTS for content changes
    componentRefs.current.forEach(element => {
      if (!element) {
        return;
      }
      const observer = new ResizeObserver(debouncedCheck);
      observer.observe(element);
      // eslint-disable-next-line fp/no-mutating-methods
      observers.push(observer);
    });

    // eslint-disable-next-line consistent-return
    return () => {
      timeoutIds.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
      observers.forEach(observer => {
        observer.disconnect();
      });
    };
  }, [mode, exportConfig, columns]);

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
              mode === DashboardMode.DASHBOARD
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
      case DashboardElementType.CHART:
        return (
          <div
            key={`chart-${elementId}`}
            ref={handleRef}
            style={getWrapperStyle()}
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
            />
          </div>
        );
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
                {mode === DashboardMode.DASHBOARD && (
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
