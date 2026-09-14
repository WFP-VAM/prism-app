import {
  DeleteOutlined,
  DescriptionOutlined,
  VisibilityOutlined,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
} from '@mui/material';
import { usePostHog } from '@posthog/react';
import { downloadToFile } from 'components/MapView/utils';
import { DashboardMode } from 'config/types';
import { useSafeTranslation } from 'i18n';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';

import { getDashboardIndexByPath } from '../../config/utils';
import { clearAnalysisResult } from '../../context/analysisResultStateSlice';
import {
  dashboardConfigSelector,
  dashboardModeSelector,
  dashboardsListSelector,
  removeDashboard,
  setMode,
  setSelectedDashboard,
} from '../../context/dashboardStateSlice';
import { generateSlugFromTitle } from '../../utils/string-utils';
import { getUniversalDashboardPath } from '../../utils/universal-routing';
import {
  isUniversalDeployment,
  normalizeIso3,
} from '../../utils/universal-utils';
import DashboardContent from './DashboardContent';
import { DashboardExportDialog } from './DashboardExport';
import {
  dashboardContainerSx,
  dashboardEditLayoutSx,
  dashboardPreviewLayoutSx,
  dashboardPreviewModeContainerSx,
  dashboardToolbarButtonSx,
  dashboardToolbarSx,
} from './dashboardViewStyles';

function DashboardView() {
  const dashboardConfig = useSelector(dashboardConfigSelector);
  const dashboards = useSelector(dashboardsListSelector);
  const {
    path: dashboardPath,
    title: dashboardTitle,
    selectedDashboardIndex,
  } = dashboardConfig;
  const mode = useSelector(dashboardModeSelector);
  const dispatch = useDispatch();
  const posthog = usePostHog();
  const { t } = useSafeTranslation();
  const { path, iso3: iso3Param } = useParams<{
    path?: string;
    iso3?: string;
  }>();
  const history = useHistory();
  const isUniversal = isUniversalDeployment();
  const iso3 = normalizeIso3(iso3Param);
  const viewStartRef = useRef<number>(Date.now());

  // Export/Publish dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const handleCloseExport = () => setExportDialogOpen(false);

  // Delete dashboard dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const handleDeleteConfirm = () => {
    dispatch(removeDashboard());
    history.push('/dashboard/create');
  };

  // Track dashboard viewed / view ended with duration
  useEffect(() => {
    if (!dashboardPath) {
      return undefined;
    }
    viewStartRef.current = Date.now();
    posthog?.capture('dashboard_viewed', {
      dashboard_title: dashboardTitle,
      dashboard_path: dashboardPath,
      dashboard_index: selectedDashboardIndex,
    });
    return () => {
      posthog?.capture('dashboard_view_ended', {
        dashboard_title: dashboardTitle,
        dashboard_path: dashboardPath,
        dashboard_index: selectedDashboardIndex,
        duration_ms: Date.now() - viewStartRef.current,
      });
    };
  }, [dashboardPath]);

  // Clear any existing analysis state when component mounts
  useEffect(() => {
    dispatch(clearAnalysisResult());
  }, [dispatch, dashboardPath]);

  // Clear analysis state when component unmounts (navigating away from dashboard)
  useEffect(
    () => () => {
      dispatch(clearAnalysisResult());
    },
    [dispatch],
  );

  // Handle dashboard path parameter and redirect logic
  useEffect(() => {
    if (dashboards.length === 0) {
      return;
    }

    if (path) {
      // Find dashboard by path and set it as selected — guard against
      // re-selecting the same dashboard when `dashboards` gets a new reference
      // from in-memory edits (which would reset mode via createInitialState).
      const dashboardIndex = getDashboardIndexByPath(path, dashboards);
      if (dashboardIndex !== dashboardConfig.selectedDashboardIndex) {
        dispatch(setSelectedDashboard(dashboardIndex));
      }
    } else {
      // No path provided, redirect to first dashboard's path
      const firstDashboard = dashboards[0];
      const firstDashboardPath =
        firstDashboard.path || generateSlugFromTitle(firstDashboard.title);
      history.replace(
        isUniversal
          ? getUniversalDashboardPath(iso3, firstDashboardPath)
          : `/dashboard/${firstDashboardPath}`,
      );
    }
  }, [
    path,
    dispatch,
    history,
    dashboards,
    dashboardConfig.selectedDashboardIndex,
    isUniversal,
    iso3,
  ]);

  const handlePreviewClick = () => {
    dispatch(setMode(DashboardMode.VIEW));
  };

  const handleExportJSON = () => {
    const {
      selectedDashboardIndex: _selectedDashboardIndex,
      maps: _maps,
      isDraft: _isDraft,
      ...dashboard
    } = dashboardConfig;
    const safeSlug = generateSlugFromTitle(
      dashboard.path || dashboard.title || 'dashboard',
    );
    const filename = `${safeSlug}_${Date.now()}`;
    downloadToFile(
      { content: JSON.stringify(dashboard, null, 2), isUrl: false },
      filename,
      'application/json',
    );
  };

  const handleClosePreview = () => {
    dispatch(setMode(DashboardMode.EDIT));
  };

  return (
    <Box
      sx={
        mode === DashboardMode.VIEW
          ? dashboardPreviewModeContainerSx
          : dashboardContainerSx
      }
    >
      <DashboardContent
        showTitle
        layoutSx={
          mode === DashboardMode.EDIT
            ? dashboardEditLayoutSx
            : dashboardPreviewLayoutSx
        }
        onEditClick={dashboardConfig.isDraft ? handleClosePreview : undefined}
      />
      {mode === DashboardMode.EDIT && (
        <Box sx={dashboardToolbarSx}>
          {dashboardConfig.isDraft && (
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<DeleteOutlined />}
              onClick={() => setDeleteDialogOpen(true)}
              sx={dashboardToolbarButtonSx}
              size="medium"
            >
              {t('Delete')}
            </Button>
          )}
          <Button
            variant="outlined"
            color="primary"
            startIcon={<VisibilityOutlined />}
            onClick={handlePreviewClick}
            sx={dashboardToolbarButtonSx}
            size="medium"
          >
            {t('Preview Dashboard')}
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<DescriptionOutlined />}
            onClick={handleExportJSON}
            sx={dashboardToolbarButtonSx}
            size="medium"
          >
            {t('Export JSON')}
          </Button>
        </Box>
      )}

      <DashboardExportDialog
        open={exportDialogOpen}
        handleClose={handleCloseExport}
      />

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogContent>
          <DialogContentText>
            {t(
              'Are you sure you want to delete "{{title}}"? This cannot be undone. You will be taken back to the dashboard creation page.',
              { title: dashboardConfig.title },
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            {t('Cancel')}
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="secondary"
            variant="contained"
          >
            {t('Delete Dashboard')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DashboardView;
