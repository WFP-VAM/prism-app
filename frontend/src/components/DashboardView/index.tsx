import { Box, makeStyles, Button } from '@material-ui/core';
import { VisibilityOutlined } from '@material-ui/icons';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { useSafeTranslation } from 'i18n';
import { DashboardMode } from 'config/types';

import {
  dashboardConfigSelector,
  dashboardModeSelector,
  setMode,
  setSelectedDashboard,
} from '../../context/dashboardStateSlice';
import { getDashboardIndexByPath, getDashboards } from '../../config/utils';
import { generateSlugFromTitle } from '../../utils/string-utils';
import { clearAnalysisResult } from '../../context/analysisResultStateSlice';
import { DashboardExportDialog } from './DashboardExport';
import DashboardContent from './DashboardContent';

function DashboardView() {
  const classes = useStyles();
  const dashboardConfig = useSelector(dashboardConfigSelector);
  const { path: dashboardPath, isEditable } = dashboardConfig;
  const mode = useSelector(dashboardModeSelector);
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();
  const { path } = useParams<{ path?: string }>();
  const history = useHistory();

  // Export/Publish dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const handleCloseExport = () => setExportDialogOpen(false);

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
    const dashboards = getDashboards();

    if (dashboards.length === 0) {
      return;
    }

    if (path) {
      // Find dashboard by path and set it as selected
      const dashboardIndex = getDashboardIndexByPath(path);
      dispatch(setSelectedDashboard(dashboardIndex));
    } else {
      // No path provided, redirect to first dashboard's path
      const firstDashboard = dashboards[0];
      const firstDashboardPath =
        firstDashboard.path || generateSlugFromTitle(firstDashboard.title);
      history.replace(`/dashboard/${firstDashboardPath}`);
    }
  }, [path, dispatch, history]);

  const handlePreviewClick = () => {
    dispatch(setMode(DashboardMode.VIEW));
  };

  const handleClosePreview = () => {
    dispatch(setMode(DashboardMode.EDIT));
  };

  return (
    <Box
      className={
        mode === DashboardMode.VIEW
          ? classes.previewModeContainer
          : classes.container
      }
    >
      <DashboardContent
        showTitle
        className={
          mode === DashboardMode.EDIT
            ? classes.editLayout
            : classes.previewLayout
        }
        isEditable={isEditable}
        onEditClick={handleClosePreview}
      />
      {mode === DashboardMode.EDIT && (
        <Box className={classes.toolbar}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<VisibilityOutlined />}
            onClick={handlePreviewClick}
            className={classes.previewButton}
            size="medium"
          >
            {t('Back to Dashboard')}
          </Button>
        </Box>
      )}

      <DashboardExportDialog
        open={exportDialogOpen}
        handleClose={handleCloseExport}
      />
    </Box>
  );
}

const useStyles = makeStyles(() => ({
  blockLabel: {
    fontWeight: 600,
    fontSize: 16,
    marginBottom: 12,
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'relative',
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
  mapColumn: {
    flex: 2, // Larger for columns containing maps
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minWidth: 0,
  },
  contentColumn: {
    flex: 1, // Smaller for columns without maps
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minWidth: 0,
  },
  grayCard: {
    background: '#F1F1F1',
    borderRadius: 8,
    marginBottom: 16,
    padding: 12,
  },
  titleCard: {
    display: 'flex',
    background: '#F1F1F1',
    borderRadius: 8,
    marginBottom: 0, // No bottom margin for title card
    padding: 12,
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
  toolbar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'white',
    borderTop: '1px solid #E0E0E0',
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'center',
    zIndex: 1400,
  },
  previewButton: {
    textTransform: 'none',
    fontWeight: 500,
  },
  previewDialog: {
    '& .MuiDialog-paper': {
      margin: '48px 0 0 0',
      height: '100vh',
      background: '#F8F8F8',
    },
    '& .MuiDialog-paperFullWidth ': {
      maxWidth: 'calc(100% - 16px)',
      width: '100%',
    },
  },
  dialogContent: {
    padding: 0,
  },
  previewContainer: {
    background: 'white',
    borderRadius: 8,
    padding: 16,
  },
  previewTitle: {
    padding: 16,
    fontWeight: 500,
    fontSize: 20,
    margin: 0,
  },
  previewModeContainer: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    background: '#F8F8F8',
    height: 'calc(100vh - 6vh)',
    padding: '32px',
    boxSizing: 'border-box',
  },
  previewActions: {
    position: 'sticky',
    top: 0,
    left: 0,
    right: 0,
    background: 'white',
    borderBottom: '1px solid #E0E0E0',
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'flex-start',
    gap: '12px',
    zIndex: 1300,
  },
  titleSection: {
    padding: '0 16px',
    margin: '16px 16px 0 16px',
  },
  mapHeaderContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editLayout: {
    display: 'flex',
    gap: 16,
    flex: 1,
  },
  previewLayout: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
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
}));

export default DashboardView;
