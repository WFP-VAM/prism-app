import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  ErrorOutlined,
} from '@mui/icons-material';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
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

import {
  importDashboardBrowseButtonSx,
  importDashboardCardSx,
  importDashboardCtaButtonSx,
  importDashboardDropTextSx,
  importDashboardDropZoneDraggingSx,
  importDashboardDropZoneSx,
  importDashboardErrorDetailSx,
  importDashboardErrorHeaderSx,
  importDashboardErrorHeadlineSx,
  importDashboardErrorIconSx,
  importDashboardErrorSx,
  importDashboardFeedbackContainerSx,
  importDashboardFeedbackTextSx,
  importDashboardRootSx,
  importDashboardSubtitleSx,
  importDashboardSuccessIconSx,
  importDashboardTitleSx,
  importDashboardUploadIconSx,
} from './importDashboardStyles';

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
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();
  const history = useHistory();
  const dashboards = useSelector(dashboardsListSelector);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dragging, setDragging] = useState(false);
  const [viewState, setViewState] = useState<ViewState>({ status: 'idle' });

  useEffect(
    () => () => {
      if (pendingTimeout.current) {
        clearTimeout(pendingTimeout.current);
      }
    },
    [],
  );

  const processFile = useCallback(
    (file: File) => {
      if (pendingTimeout.current) {
        clearTimeout(pendingTimeout.current);
      }
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
                    '{{field}} is missing, please check your config file and try again',
                    { field: String(field) },
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
    <Box sx={importDashboardRootSx}>
      <Box sx={importDashboardCardSx}>
        {viewState.status === 'idle' || viewState.status === 'error' ? (
          <>
            <Typography variant="h2" sx={importDashboardTitleSx}>
              {t('Import dashboard')}
            </Typography>
            <Typography variant="body1" sx={importDashboardSubtitleSx}>
              {t('Upload a JSON file exported from a Prism dashboard.')}
            </Typography>

            <Box
              sx={[
                importDashboardDropZoneSx,
                dragging && importDashboardDropZoneDraggingSx,
              ]}
              onDragOver={e => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <CloudUploadOutlined sx={importDashboardUploadIconSx} />
              <Typography variant="body1" sx={importDashboardDropTextSx}>
                {t('Drag & drop a JSON file here')}
              </Typography>
              <Typography variant="body1" color="textSecondary">
                {t('or')}
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                sx={importDashboardBrowseButtonSx}
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
              <Box sx={importDashboardErrorSx}>
                <Box sx={importDashboardErrorHeaderSx}>
                  <ErrorOutlined sx={importDashboardErrorIconSx} />
                  <Typography
                    variant="subtitle2"
                    sx={importDashboardErrorHeadlineSx}
                  >
                    {t('Invalid dashboard file')}
                  </Typography>
                </Box>
                <Typography variant="body1" sx={importDashboardErrorDetailSx}>
                  {viewState.detail}
                </Typography>
              </Box>
            )}
          </>
        ) : viewState.status === 'loading' ? (
          <Box sx={importDashboardFeedbackContainerSx}>
            <CircularProgress size={48} />
            <Typography variant="body1" sx={importDashboardFeedbackTextSx}>
              {t('Importing dashboard…')}
            </Typography>
          </Box>
        ) : (
          <Box sx={importDashboardFeedbackContainerSx}>
            <CheckCircleOutlined sx={importDashboardSuccessIconSx} />
            <Typography variant="h2" sx={importDashboardTitleSx}>
              {viewState.alreadyExists
                ? t('Dashboard already exists')
                : t('Import complete')}
            </Typography>
            <Typography variant="body1" sx={importDashboardSubtitleSx}>
              <strong>{viewState.dashboardTitle}</strong>{' '}
              {t('is ready to view.')}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              sx={importDashboardCtaButtonSx}
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

export default ImportDashboardView;
