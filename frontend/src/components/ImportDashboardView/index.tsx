import {
  Box,
  Button,
  CircularProgress,
  makeStyles,
  Typography,
} from '@material-ui/core';
import {
  CheckCircleOutline,
  CloudUploadOutlined,
  ErrorOutline,
} from '@material-ui/icons';
import type { Dashboard } from 'config/types';
import {
  dashboardsListSelector,
  setDraftDashboard,
} from 'context/dashboardStateSlice';
import {
  formatDashboardValidationError,
  validateImportedDashboardConfig,
} from 'dashboardConfig/schema';
import { useSafeTranslation } from 'i18n';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { generateSlugFromTitle } from 'utils/string-utils';

type ViewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'success';
      dashboardPath: string;
      dashboardTitle: string;
      alreadyExists: boolean;
    }
  | { status: 'error'; detail: string };

const sortedReplacer = (_key: string, value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(
        Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
          a.localeCompare(b),
        ),
      )
    : value;

const normalize = ({ isDraft: _isDraft, ...rest }: Dashboard) =>
  JSON.stringify(rest, sortedReplacer);

function ImportDashboardView() {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();
  const history = useHistory();
  const dashboards = useSelector(dashboardsListSelector);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dragging, setDragging] = useState(false);
  const [viewState, setViewState] = useState<ViewState>({ status: 'idle' });

  useEffect(() => () => clearTimeout(pendingTimeout.current), []);

  const processFile = useCallback(
    (file: File) => {
      clearTimeout(pendingTimeout.current);
      setViewState({ status: 'loading' });
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          const result = validateImportedDashboardConfig(parsed);
          if (!result.success) {
            const issue = result.error.issues[0];
            const field = issue.path[issue.path.length - 1];
            const detail =
              field &&
              issue.message.toLowerCase().includes('received undefined')
                ? t(
                    `${String(field)} is missing, please check your config file and try again`,
                  )
                : formatDashboardValidationError(result.error);
            setViewState({ status: 'error', detail });
            return;
          }
          const dashboard = result.data;
          const importedNorm = normalize(dashboard);
          const duplicate = dashboards.find(d => normalize(d) === importedNorm);
          const dashboardPath =
            duplicate?.path ||
            dashboard.path ||
            generateSlugFromTitle(dashboard.title);
          if (!duplicate) {
            dispatch(setDraftDashboard(dashboard));
          }
          pendingTimeout.current = setTimeout(() => {
            setViewState({
              status: 'success',
              dashboardPath,
              dashboardTitle: dashboard.title,
              alreadyExists: Boolean(duplicate),
            });
          }, 500);
        } catch {
          setViewState({
            status: 'error',
            detail: t('Could not parse file as JSON.'),
          });
        }
      };
      reader.readAsText(file);
    },
    [dispatch, dashboards, t],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleViewDashboard = (dashboardPath: string) => {
    history.push(`/dashboard/${dashboardPath}`);
  };

  return (
    <Box className={classes.root}>
      <Box className={classes.card}>
        {viewState.status === 'idle' || viewState.status === 'error' ? (
          <>
            <Typography variant="h2" className={classes.title}>
              {t('Import dashboard')}
            </Typography>
            <Typography variant="body1" className={classes.subtitle}>
              {t('Upload a JSON file exported from a Prism dashboard.')}
            </Typography>

            <Box
              className={`${classes.dropZone} ${dragging ? classes.dropZoneDragging : ''}`}
              onDragOver={e => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <CloudUploadOutlined className={classes.uploadIcon} />
              <Typography variant="body1" className={classes.dropText}>
                {t('Drag & drop a JSON file here')}
              </Typography>
              <Typography variant="body1" color="textSecondary">
                {t('or')}
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                className={classes.browseButton}
                onClick={e => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                {t('Browse files')}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </Box>

            {viewState.status === 'error' && (
              <Box className={classes.error}>
                <Box className={classes.errorHeader}>
                  <ErrorOutline className={classes.errorIcon} />
                  <Typography
                    variant="subtitle2"
                    className={classes.errorHeadline}
                  >
                    {t('Invalid dashboard file')}
                  </Typography>
                </Box>
                <Typography variant="body1" className={classes.errorDetail}>
                  {viewState.detail}
                </Typography>
              </Box>
            )}
          </>
        ) : viewState.status === 'loading' ? (
          <Box className={classes.feedbackContainer}>
            <CircularProgress size={48} />
            <Typography variant="body1" className={classes.feedbackText}>
              {t('Importing dashboard…')}
            </Typography>
          </Box>
        ) : (
          <Box className={classes.feedbackContainer}>
            <CheckCircleOutline className={classes.successIcon} />
            <Typography variant="h2" className={classes.title}>
              {viewState.alreadyExists
                ? t('Dashboard already exists')
                : t('Import complete')}
            </Typography>
            <Typography variant="body1" className={classes.subtitle}>
              <strong>{viewState.dashboardTitle}</strong>{' '}
              {t('is ready to view.')}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              className={classes.ctaButton}
              onClick={() => handleViewDashboard(viewState.dashboardPath)}
            >
              {t('View dashboard')}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 'calc(100vh - 56px)',
    background: '#F8F8F8',
  },
  card: {
    background: 'white',
    borderRadius: 8,
    padding: theme.spacing(4),
    width: 480,
    maxWidth: '90vw',
    boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  title: {
    fontWeight: 600,
  },
  subtitle: {
    color: theme.palette.text.secondary,
    '& strong': {
      fontWeight: 700,
    },
  },
  dropZone: {
    border: `2px dashed ${theme.palette.divider}`,
    borderRadius: 8,
    padding: theme.spacing(4),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing(1),
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    '&:hover': {
      borderColor: theme.palette.primary.main,
      background: '#F0F7FF',
    },
  },
  dropZoneDragging: {
    borderColor: theme.palette.primary.main,
    background: '#F0F7FF',
  },
  uploadIcon: {
    fontSize: 48,
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(0.5),
  },
  dropText: {
    fontWeight: 500,
  },
  browseButton: {
    marginTop: theme.spacing(1),
    '& span': {
      textTransform: 'none',
    },
  },
  error: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.75),
    padding: theme.spacing(1.5),
    background: '#FFF3F3',
    border: `1px solid ${theme.palette.error.light}`,
    borderRadius: 6,
    color: theme.palette.error.dark,
  },
  errorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.75),
  },
  errorHeadline: {
    fontWeight: 600,
    color: theme.palette.error.dark,
  },
  errorIcon: {
    fontSize: 18,
    flexShrink: 0,
    color: theme.palette.error.dark,
  },
  errorDetail: {
    fontSize: '0.8rem',
    color: theme.palette.error.dark,
    paddingLeft: theme.spacing(3.25),
  },
  feedbackContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing(2),
    padding: theme.spacing(2, 0),
    textAlign: 'center',
  },
  feedbackText: {
    color: theme.palette.text.secondary,
  },
  successIcon: {
    fontSize: 56,
    color: theme.palette.success?.main ?? '#4CAF50',
  },
  ctaButton: {
    marginTop: theme.spacing(1),
    '& span': {
      textTransform: 'none',
    },
  },
}));

export default ImportDashboardView;
