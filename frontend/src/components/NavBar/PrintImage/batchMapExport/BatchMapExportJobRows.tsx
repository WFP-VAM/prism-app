import {
  Box,
  Button,
  Divider,
  LinearProgress,
  List,
  ListItem,
  Typography,
} from '@mui/material';
import { addNotification } from 'context/notificationStateSlice';
import { useSafeTranslation } from 'i18n';
import type { TFunction } from 'i18next';
import { cyanBlue } from 'muiTheme';
import React, { useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { getBatchMapExportProgressDisplay } from './batchMapExportProgress';
import type { BatchMapExportJobRow } from './types';

function batchExportStatusLabel(status: string, t: TFunction): string {
  switch (status) {
    case 'queued':
      return t('batch_export_status_queued');
    case 'running':
      return t('batch_export_status_running');
    case 'finishing':
      return t('batch_export_status_finishing');
    case 'succeeded':
      return t('batch_export_status_succeeded');
    case 'failed':
      return t('batch_export_status_failed');
    default:
      return status;
  }
}

type Props = {
  jobs: BatchMapExportJobRow[];
  onDismiss: (clientId: string) => void;
  variant: 'compact' | 'panel';
};

function BatchMapExportJobRows({ jobs, onDismiss, variant }: Props) {
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();
  const dense = variant === 'compact';

  const sorted = useMemo(
    () =>
      [...jobs].sort((a, b) =>
        a.clientId < b.clientId ? 1 : a.clientId > b.clientId ? -1 : 0,
      ),
    [jobs],
  );

  if (sorted.length === 0) {
    return null;
  }

  return (
    <List
      dense={dense}
      disablePadding
      sx={theme => ({
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        ...(variant === 'panel'
          ? {
              backgroundColor: theme.palette.grey[50],
              borderRadius: theme.shape.borderRadius,
              border: `1px solid ${theme.palette.divider}`,
              paddingTop: theme.spacing(0.5),
              paddingBottom: theme.spacing(0.5),
            }
          : {}),
      })}
      data-testid="batch-map-export-job-list"
    >
      {sorted.map((job, idx) => {
        const { mapsCurrent, mapsTotal, barMode, barValue, displayStatus } =
          getBatchMapExportProgressDisplay(job);

        const failed = Boolean(job.error || job.status === 'failed');
        const succeeded = job.status === 'succeeded';
        const showProgress = !failed && !succeeded;

        return (
          <React.Fragment key={job.clientId}>
            {idx > 0 && <Divider component="li" />}
            <ListItem
              alignItems="flex-start"
              sx={{
                flexDirection: 'column',
                alignItems: 'stretch',
              }}
            >
              <Box
                sx={{
                  minWidth: 0,
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <Typography
                  variant="subtitle2"
                  component="div"
                  sx={{
                    overflowWrap: 'break-word',
                    wordBreak: 'break-word',
                  }}
                >
                  {t(job.layerDisplayName)}
                </Typography>
                <Typography
                  variant="subtitle2"
                  component="div"
                  sx={theme => ({
                    overflowWrap: 'break-word',
                    wordBreak: 'break-word',
                    marginTop: theme.spacing(0.25),
                  })}
                >
                  {job.datesSummary}
                </Typography>
                {failed ? (
                  <Typography
                    variant="subtitle2"
                    color="error"
                    component="div"
                    sx={theme => ({
                      overflowWrap: 'break-word',
                      wordBreak: 'break-word',
                      marginTop: theme.spacing(1),
                    })}
                  >
                    {job.error ??
                      t('Batch export failed: {{message}}', {
                        message: batchExportStatusLabel(job.status, t),
                      })}
                  </Typography>
                ) : showProgress ? (
                  <Box sx={theme => ({ marginTop: theme.spacing(1) })}>
                    <Typography
                      variant="subtitle2"
                      color="textSecondary"
                      component="div"
                      sx={theme => ({
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                        textTransform: 'none',
                        marginBottom: theme.spacing(0.75),
                      })}
                    >
                      {t('batch_export_status_and_maps', {
                        status: batchExportStatusLabel(displayStatus, t),
                        current: mapsCurrent,
                        total: mapsTotal,
                      })}
                    </Typography>
                    <LinearProgress
                      sx={theme => ({
                        height: 6,
                        borderRadius: theme.shape.borderRadius,
                      })}
                      variant={barMode}
                      value={barValue}
                    />
                  </Box>
                ) : null}
                <Box
                  sx={theme => ({
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                    gap: theme.spacing(1),
                    marginTop: theme.spacing(1),
                  })}
                >
                  <Button
                    color="primary"
                    size="small"
                    onClick={() => onDismiss(job.clientId)}
                  >
                    {t('Cancel')}
                  </Button>
                  {job.downloadUrl && succeeded && (
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      style={{ backgroundColor: cyanBlue, color: 'black' }}
                      onClick={() => {
                        try {
                          window.open(
                            job.downloadUrl!,
                            '_blank',
                            'noopener,noreferrer',
                          );
                          onDismiss(job.clientId);
                        } catch (err) {
                          console.error('Batch export download failed:', err);
                          dispatch(
                            addNotification({
                              type: 'error',
                              message: t(
                                'Something went wrong with the batch download. Please try again.',
                              ),
                            }),
                          );
                        }
                      }}
                      title={
                        job.downloadFilename ? job.downloadFilename : undefined
                      }
                    >
                      {t('Download')}
                    </Button>
                  )}
                </Box>
              </Box>
            </ListItem>
          </React.Fragment>
        );
      })}
    </List>
  );
}

export default BatchMapExportJobRows;
