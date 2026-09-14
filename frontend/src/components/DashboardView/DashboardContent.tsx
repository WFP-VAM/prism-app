import { Close, Edit } from '@mui/icons-material';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Switch,
  Typography,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { getImageUrl } from 'assets/images';
import { useSafeTranslation } from 'i18n';
import { type ReactNode, useEffect, useState } from 'react';
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
import { setIsMapLayerActive } from '../../context/analysisResultStateSlice';
import {
  dashboardColumnsSelector,
  dashboardConfigSelector,
  dashboardMapElementsSelector,
  dashboardMapStateSelector,
  dashboardModeSelector,
  dashboardsListSelector,
  dashboardSyncEnabledSelector,
  removeElement,
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
import {
  dashboardContentBlockLabelSx,
  dashboardContentBlockTypeRowActionsSx,
  dashboardContentBlockTypeRowSx,
  dashboardContentBlockTypeSelectSx,
  dashboardContentContentColumnSx,
  dashboardContentDynamicColumnLayoutSx,
  dashboardContentDynamicColumnPreviewLayoutSx,
  dashboardContentGrayCardSx,
  dashboardContentLayoutSx,
  dashboardContentLogoSx,
  dashboardContentMapBlockSwapButtonSx,
  dashboardContentMapColumnSx,
  dashboardContentMapHeaderActionsSx,
  dashboardContentMapHeaderContainerSx,
  dashboardContentMapHeaderTitleSx,
  dashboardContentMapHeaderUseLatestCheckboxSx,
  dashboardContentPreviewContainerSx,
  dashboardContentRemoveBlockButtonSx,
  dashboardContentRootSx,
  dashboardContentSyncToggleSx,
  dashboardContentTitleActionsSx,
  dashboardContentTitleBarInputSx,
  dashboardContentTitleBarLabelSx,
  dashboardContentTitleBarTypographySx,
  dashboardContentTitleSectionEditSx,
  dashboardContentTitleSectionSx,
  dashboardContentTitleSx,
  dashboardContentUseLatestCheckboxSx,
} from './dashboardContentStyles';
import MapBlock from './MapBlock';
import TableBlock from './TableBlock';
import TextBlock from './TextBlock';
import { useColumnHeightManagement } from './useColumnHeightManagement';

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
  layoutSx?: SxProps<Theme>;
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
  layoutSx,
  logoConfig,
  exportConfig,
  onEditClick,
}: DashboardContentProps) {
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

  const handleTableShowOnMapChange = (
    columnIndex: number,
    elementIndex: number,
    checked: boolean,
  ) => {
    dispatch(setIsMapLayerActive(checked));
    dispatch(
      updateBlockConfig({
        columnIndex,
        elementIndex,
        updates: { addResultToMap: checked },
      }),
    );
  };

  type PendingAction =
    | {
        kind: 'changeType';
        columnIndex: number;
        elementIndex: number;
        newType: DashboardElementType;
      }
    | {
        kind: 'remove';
        columnIndex: number;
        elementIndex: number;
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
    if (pendingAction.kind === 'changeType') {
      dispatch(
        setElementType({
          columnIndex: pendingAction.columnIndex,
          elementIndex: pendingAction.elementIndex,
          newType: pendingAction.newType,
        }),
      );
    } else if (pendingAction.kind === 'remove') {
      dispatch(
        removeElement({
          columnIndex: pendingAction.columnIndex,
          elementIndex: pendingAction.elementIndex,
        }),
      );
    }
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
  const { componentHeights, columnRefs, componentRefs } =
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
    extraContent?: ReactNode,
  ) => {
    const supportsUseLatest =
      currentType === DashboardElementType.CHART ||
      currentType === DashboardElementType.TABLE;

    return (
      <Box sx={dashboardContentBlockTypeRowSx}>
        <Typography variant="h3" sx={dashboardContentBlockLabelSx}>
          {t('Block #{{number}}', { number: elementIndex + 1 })}
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
          sx={dashboardContentBlockTypeSelectSx}
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
            sx={dashboardContentUseLatestCheckboxSx}
          />
        )}
        <Box sx={dashboardContentBlockTypeRowActionsSx}>
          {extraContent}
          <IconButton
            size="small"
            onClick={() =>
              stagePendingAction({ kind: 'remove', columnIndex, elementIndex })
            }
            sx={dashboardContentRemoveBlockButtonSx}
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>
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
        ...(heightConfig.overflow === 'scroll'
          ? { overflowX: 'hidden' as const, scrollbarGutter: 'stable' as const }
          : {}),
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
            sx={
              mode === DashboardMode.VIEW
                ? dashboardContentPreviewContainerSx
                : dashboardContentGrayCardSx
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
                      <FormControlLabel
                        control={
                          <Switch
                            checked={element.addResultToMap !== false}
                            onChange={(_event, checked) =>
                              handleTableShowOnMapChange(
                                columnIndex,
                                elementIndex,
                                checked,
                              )
                            }
                            color="primary"
                            size="small"
                          />
                        }
                        label={t('Show on map')}
                      />,
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
              allowDownload={!exportConfig}
              isOverflowing={heightConfig?.overflow === 'scroll'}
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
      <Box sx={dashboardContentRootSx}>
        <Box
          sx={
            layoutSx
              ? ([dashboardContentLayoutSx, layoutSx] as SxProps<Theme>)
              : dashboardContentLayoutSx
          }
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {showTitle && (
            <Box
              sx={
                mode === DashboardMode.EDIT
                  ? dashboardContentTitleSectionEditSx
                  : dashboardContentTitleSectionSx
              }
            >
              {mode !== DashboardMode.EDIT ? (
                <>
                  {logoConfig?.visible && getImageUrl(logo) && (
                    <Box
                      component="img"
                      sx={dashboardContentLogoSx}
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
                    sx={dashboardContentTitleSx}
                  >
                    {t(dashboardTitle || 'Untitled Dashboard')}
                  </Typography>
                  {mode === DashboardMode.VIEW && (
                    <Box sx={dashboardContentTitleActionsSx}>
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
                <Box sx={dashboardContentGrayCardSx}>
                  <Box component="label" sx={dashboardContentTitleBarLabelSx}>
                    <Typography
                      variant="h2"
                      component="span"
                      sx={dashboardContentTitleBarTypographySx}
                    >
                      {t('Dashboard title')}
                    </Typography>
                    <Box
                      component="input"
                      type="text"
                      sx={dashboardContentTitleBarInputSx}
                      placeholder={t('Enter dashboard title')}
                      value={localTitle}
                      onChange={e => setLocalTitle(e.target.value)}
                      onBlur={handleTitleBlur}
                      name="dashboard-title"
                    />
                  </Box>
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
                  sx={dashboardContentSyncToggleSx}
                />
              )}
            </Box>
          )}
          {columns.some(c => c.length > 0) && (
            <Box
              sx={
                mode !== DashboardMode.EDIT
                  ? dashboardContentDynamicColumnPreviewLayoutSx
                  : dashboardContentDynamicColumnLayoutSx
              }
            >
              {columns.map((column, columnIndex) => {
                if (column.length === 0) {
                  return null;
                }
                const hasMapElements = column.some(
                  el => el.type === DashboardElementType.MAP,
                );
                const columnSx = hasMapElements
                  ? dashboardContentMapColumnSx
                  : dashboardContentContentColumnSx;

                return (
                  <Box
                    key={`column-${columnIndex}`}
                    sx={columnSx}
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
        slotProps={{ transition: { onExited: () => setPendingAction(null) } }}
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
            {pendingAction?.kind === 'remove'
              ? t('Remove block')
              : t('Change block type')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

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
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();
  const mapState = useSelector(dashboardMapStateSelector(elementId));
  const useLatestAvailableDate = mapState?.useLatestAvailableDate ?? false;

  return (
    <Box sx={dashboardContentMapHeaderContainerSx}>
      <Typography
        variant="h3"
        component="h3"
        sx={[dashboardContentBlockLabelSx, dashboardContentMapHeaderTitleSx]}
      >
        {mapCount > 1
          ? t('Map {{number}}', { number: mapIndex + 1 })
          : t('Map block')}{' '}
        {t('Choose map layers')}
      </Typography>
      <Box sx={dashboardContentMapHeaderActionsSx}>
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
          sx={dashboardContentMapHeaderUseLatestCheckboxSx}
        />
        <Button
          variant="outlined"
          color="primary"
          size="small"
          onClick={onSwapMapPosition}
          sx={dashboardContentMapBlockSwapButtonSx}
        >
          {t('Swap map position')}
        </Button>
      </Box>
    </Box>
  );
}

export default DashboardContent;
