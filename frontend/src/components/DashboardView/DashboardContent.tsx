import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  FormControlLabel,
  makeStyles,
  MenuItem,
  Select,
  Switch,
  Typography,
} from '@material-ui/core';
import { Edit } from '@material-ui/icons';
import { getImageUrl } from 'assets/images';
import { useSafeTranslation } from 'i18n';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';

import { appConfig } from '../../config';
import {
  AdminCodeString,
  ChartHeight,
  DashboardElements,
  DashboardElementType,
  DashboardMode,
} from '../../config/types';
import { findDashboardByPath } from '../../config/utils';
import {
  dashboardColumnsSelector,
  dashboardConfigSelector,
  dashboardMapElementsSelector,
  dashboardMapStateSelector,
  dashboardModeSelector,
  dashboardsListSelector,
  dashboardSyncEnabledSelector,
  selectedDashboardIndexSelector,
  setElementType,
  setMapUseLatestDate,
  setTitle,
  swapMapPosition,
  toggleMapSync,
  updateBlockConfig,
} from '../../context/dashboardStateSlice';
import { addNotification } from '../../context/notificationStateSlice';
import { generateSlugFromTitle } from '../../utils/string-utils';
import ChartBlock from './ChartBlock';
import { CHART_HEIGHTS } from './chartConstants';
import MapBlock from './MapBlock';
import TableBlock from './TableBlock';
import TextBlock from './TextBlock';
import { GAP, useColumnHeightManagement } from './useColumnHeightManagement';

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
  onEditClick,
}: DashboardContentProps) {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const dashboardConfig = useSelector(dashboardConfigSelector);
  const { title: dashboardTitle } = dashboardConfig;
  const dashboards = useSelector(dashboardsListSelector);
  const selectedIndex = useSelector(selectedDashboardIndexSelector);
  const columns = useSelector(dashboardColumnsSelector);
  const mapElements = useSelector(dashboardMapElementsSelector);
  const mode = useSelector(dashboardModeSelector);
  const history = useHistory();

  const [localTitle, setLocalTitle] = useState(dashboardTitle);

  useEffect(() => {
    setLocalTitle(dashboardTitle);
  }, [dashboardTitle]);

  const handleTitleBlur = () => {
    if (localTitle === dashboardTitle) {
      return;
    }
    const newSlug = generateSlugFromTitle(localTitle);
    const existing = findDashboardByPath(newSlug, dashboards);
    if (existing && existing.index !== selectedIndex) {
      dispatch(
        addNotification({
          type: 'error',
          message: t('A dashboard with this name already exists'),
        }),
      );
      setLocalTitle(dashboardTitle);
      return;
    }
    dispatch(setTitle(localTitle));
    history.replace(`/dashboard/${newSlug}`);
  };

  const { logo } = appConfig.header || {};
  const logoHeightMultiplier = 32;
  const logoHeight = logoConfig ? logoHeightMultiplier * logoConfig.scale : 0;
  const dispatch = useDispatch();
  const syncEnabled = useSelector(dashboardSyncEnabledSelector);

  type PendingAction = {
    kind: 'changeType';
    columnIndex: number;
    elementIndex: number;
    newType: DashboardElementType;
  };

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  const stagePendingAction = (action: PendingAction) => {
    setPendingAction(action);
    setDialogOpen(true);
  };

  const cancelPendingAction = () => {
    setDialogOpen(false);
  };

  const confirmPendingAction = () => {
    if (!pendingAction) {
      return;
    }
    dispatch(
      setElementType({
        columnIndex: pendingAction.columnIndex,
        elementIndex: pendingAction.elementIndex,
        newType: pendingAction.newType,
      }),
    );
    setDialogOpen(false);
  };

  const handleBlockUseLatestChange = (
    columnIndex: number,
    elementIndex: number,
    elementType: DashboardElementType,
    checked: boolean,
  ) => {
    if (
      elementType !== DashboardElementType.CHART &&
      elementType !== DashboardElementType.TABLE
    ) {
      return;
    }

    dispatch(
      updateBlockConfig({
        columnIndex,
        elementIndex,
        updates: {
          useLatestAvailableDate: checked,
          ...(checked
            ? elementType === DashboardElementType.CHART
              ? { startDate: undefined, endDate: undefined }
              : { startDate: undefined }
            : {}),
        },
      }),
    );
  };

  // Column Height Management - extracted to custom hook
  const { componentHeights, columnRefs, componentRefs, recalculationCount } =
    useColumnHeightManagement({
      mode,
      exportConfig,
      columns,
    });

  const BLOCK_TYPE_OPTIONS = [
    { value: DashboardElementType.TEXT, label: t('Text') },
    { value: DashboardElementType.CHART, label: t('Chart') },
    { value: DashboardElementType.TABLE, label: t('Table') },
  ];

  const renderBlockTypeSelector = (
    currentType: DashboardElementType,
    columnIndex: number,
    elementIndex: number,
    useLatestAvailableDate = false,
  ) => {
    const supportsUseLatest =
      currentType === DashboardElementType.CHART ||
      currentType === DashboardElementType.TABLE;

    return (
      <Box className={classes.blockTypeRow}>
        <Typography variant="h3" className={classes.blockLabel}>
          {t(`Block #${elementIndex + 1}`)}
        </Typography>
        <Select
          value={currentType}
          onChange={e => {
            const newType = e.target.value as DashboardElementType;
            if (newType !== currentType) {
              stagePendingAction({
                kind: 'changeType',
                columnIndex,
                elementIndex,
                newType,
              });
            }
          }}
          className={classes.blockTypeSelect}
          disableUnderline
          variant="outlined"
        >
          {BLOCK_TYPE_OPTIONS.map(opt => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
        {supportsUseLatest && (
          <FormControlLabel
            control={
              <Checkbox
                checked={useLatestAvailableDate}
                onChange={(_event, checked) =>
                  handleBlockUseLatestChange(
                    columnIndex,
                    elementIndex,
                    currentType,
                    checked,
                  )
                }
                color="primary"
              />
            }
            label={t('Use latest available data')}
            className={classes.useLatestCheckbox}
          />
        )}
      </Box>
    );
  };

  const renderElement = (
    element: DashboardElements,
    columnIndex: number,
    elementIndex: number,
  ) => {
    if (!element) {
      return null;
    }
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
            key={`map-${selectedIndex}-${elementId}`}
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
            {mode === DashboardMode.EDIT && (
              <MapEditHeader
                elementId={elementId}
                mapIndex={elementIndex}
                mapCount={mapElements.length}
                onSwapMapPosition={() => dispatch(swapMapPosition())}
              />
            )}
            <div style={{ height: '100%', flex: 1, minHeight: 0 }}>
              <MapBlock elementId={elementId} exportConfig={exportConfig} />
            </div>
          </Box>
        );
      case DashboardElementType.TEXT:
        return (
          <div
            key={`text-${selectedIndex}-${elementId}`}
            ref={handleRef}
            style={getWrapperStyle()}
          >
            <TextBlock
              content={element.content || ''}
              columnIndex={columnIndex}
              elementIndex={elementIndex}
              headerSlot={
                mode === DashboardMode.EDIT
                  ? renderBlockTypeSelector(
                      element.type,
                      columnIndex,
                      elementIndex,
                    )
                  : undefined
              }
            />
          </div>
        );
      case DashboardElementType.TABLE:
        return (
          <div
            key={`table-${selectedIndex}-${elementId}`}
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
              useLatestAvailableDate={element.useLatestAvailableDate}
              allowDownload={!exportConfig}
              addResultToMap={element.addResultToMap}
              sortColumn={element.sortColumn}
              sortOrder={element.sortOrder}
              headerSlot={
                mode === DashboardMode.EDIT
                  ? renderBlockTypeSelector(
                      element.type,
                      columnIndex,
                      elementIndex,
                      element.useLatestAvailableDate ?? false,
                    )
                  : undefined
              }
            />
          </div>
        );
      case DashboardElementType.CHART: {
        // Calculate intended height: chart height + padding + header + margins
        const chartHeight = element.chartHeight || ChartHeight.TALL;
        const intendedHeight = CHART_HEIGHTS[chartHeight] + 100;

        return (
          <div
            key={`chart-${selectedIndex}-${elementId}`}
            ref={handleRef}
            style={getWrapperStyle()}
            data-intended-height={intendedHeight}
          >
            <ChartBlock
              index={elementIndex}
              columnIndex={columnIndex}
              elementIndex={elementIndex}
              startDate={element.startDate}
              endDate={element.endDate}
              layerId={element.layerId}
              adminUnitLevel={element.adminUnitLevel}
              adminUnitId={element.adminUnitId}
              chartHeight={element.chartHeight}
              useLatestAvailableDate={element.useLatestAvailableDate}
              latestPeriod={element.latestPeriod}
              periodReference={element.periodReference}
              allowDownload={!exportConfig}
              isOverflowing={heightConfig?.overflow === 'auto'}
              recalculationCount={recalculationCount}
              headerSlot={
                mode === DashboardMode.EDIT
                  ? renderBlockTypeSelector(
                      element.type,
                      columnIndex,
                      elementIndex,
                      element.useLatestAvailableDate ?? false,
                    )
                  : undefined
              }
            />
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <>
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
                  {logoConfig?.visible && getImageUrl(logo) && (
                    <img
                      className={classes.logo}
                      style={{
                        height: logoHeight,
                      }}
                      src={getImageUrl(logo)}
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
                      {onEditClick && (
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
                      value={localTitle}
                      onChange={e => setLocalTitle(e.target.value)}
                      onBlur={handleTitleBlur}
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
          {columns.some(c => c.length > 0) && (
            <Box
              className={
                mode !== DashboardMode.EDIT
                  ? classes.dynamicColumnPreviewLayout
                  : classes.dynamicColumnLayout
              }
            >
              {columns.map((column, columnIndex) => {
                if (column.length === 0) {
                  return null;
                }
                const hasMapElements = column.some(
                  el => el.type === DashboardElementType.MAP,
                );
                const columnClass = hasMapElements
                  ? classes.mapColumn
                  : classes.contentColumn;

                return (
                  <Box
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
      <Dialog
        open={dialogOpen}
        onClose={cancelPendingAction}
        TransitionProps={{ onExited: () => setPendingAction(null) }}
        maxWidth="xs"
        fullWidth
      >
        <DialogContent>
          <DialogContentText>
            {t('Are you sure? This action cannot be undone.')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelPendingAction} color="primary">
            {t('Cancel')}
          </Button>
          <Button
            onClick={confirmPendingAction}
            color="secondary"
            variant="contained"
          >
            {t('Change block type')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
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
  blockTypeRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
    '& $blockLabel': {
      marginBottom: 0,
    },
  },
  useLatestCheckbox: {
    margin: 0,
    marginLeft: 'auto',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  mapHeaderActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    marginLeft: 'auto',
  },
  mapHeaderUseLatestCheckbox: {
    margin: 0,
    whiteSpace: 'nowrap',
  },
  blockTypeSelect: {
    fontSize: 14,
    fontWeight: 500,
    background: 'white',
    borderRadius: 4,
    padding: '2px 8px',
    '& .MuiSelect-root': {
      paddingTop: 4,
      paddingBottom: 4,
    },
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
  mapHeaderTitle: {
    marginBottom: 0,
    flex: '1 1 auto',
    minWidth: 0,
  },
  mapBlockSwapButton: {
    textTransform: 'none',
    fontWeight: 500,
    flexShrink: 0,
  },
  mapHeaderContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
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

interface MapEditHeaderProps {
  elementId: string;
  mapIndex: number;
  mapCount: number;
  onSwapMapPosition: () => void;
}

function MapEditHeader({
  elementId,
  mapIndex,
  mapCount,
  onSwapMapPosition,
}: MapEditHeaderProps) {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();
  const mapState = useSelector(dashboardMapStateSelector(elementId));
  const useLatestAvailableDate = mapState?.useLatestAvailableDate ?? false;

  return (
    <div className={classes.mapHeaderContainer}>
      <Typography
        variant="h3"
        component="h3"
        className={`${classes.blockLabel} ${classes.mapHeaderTitle}`}
      >
        {mapCount > 1 ? t(`Map ${mapIndex + 1}`) : t('Map block')} —{' '}
        {t('Choose map layers')}
      </Typography>
      <Box className={classes.mapHeaderActions}>
        <FormControlLabel
          control={
            <Checkbox
              checked={useLatestAvailableDate}
              onChange={(_event, checked) =>
                dispatch(setMapUseLatestDate({ elementId, value: checked }))
              }
              color="primary"
            />
          }
          label={t('Use latest available data')}
          className={classes.mapHeaderUseLatestCheckbox}
        />
        <Button
          variant="outlined"
          color="primary"
          size="small"
          onClick={onSwapMapPosition}
          className={classes.mapBlockSwapButton}
        >
          {t('Swap map position')}
        </Button>
      </Box>
    </div>
  );
}

export default DashboardContent;
