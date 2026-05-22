import {
  Box,
  Button,
  createStyles,
  Divider,
  LinearProgress,
  List,
  ListItem,
  makeStyles,
  Theme,
  Typography,
} from '@material-ui/core';
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
  const classes = useStyles();
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

  const listClass =
    variant === 'panel' ? `${classes.list} ${classes.listPanel}` : classes.list;

  return (
    <List
      dense={dense}
      disablePadding
      className={listClass}
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
            <ListItem alignItems="flex-start" className={classes.listItem}>
              <Box className={classes.jobBody}>
                <Typography
                  variant="subtitle2"
                  component="div"
                  className={classes.jobLineText}
                >
                  {t(job.layerDisplayName)}
                </Typography>
                <Typography
                  variant="subtitle2"
                  component="div"
                  className={`${classes.datesLine} ${classes.jobLineText}`}
                >
                  {job.datesSummary}
                </Typography>
                {failed ? (
                  <Typography
                    variant="subtitle2"
                    color="error"
                    component="div"
                    className={`${classes.progressArea} ${classes.jobLineText}`}
                  >
                    {job.error ??
                      t('Batch export failed: {{message}}', {
                        message: batchExportStatusLabel(job.status, t),
                      })}
                  </Typography>
                ) : showProgress ? (
                  <Box className={classes.progressArea}>
                    <Typography
                      variant="subtitle2"
                      color="textSecondary"
                      component="div"
                      className={`${classes.statusProgressLine} ${classes.jobLineText}`}
                    >
                      {t('batch_export_status_and_maps', {
                        status: batchExportStatusLabel(displayStatus, t),
                        current: mapsCurrent,
                        total: mapsTotal,
                      })}
                    </Typography>
                    <LinearProgress
                      className={classes.progress}
                      variant={barMode}
                      value={barValue}
                    />
                  </Box>
                ) : null}
                <Box className={classes.actions}>
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

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    list: {
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
    },
    listPanel: {
      backgroundColor: theme.palette.grey[50],
      borderRadius: theme.shape.borderRadius,
      border: `1px solid ${theme.palette.divider}`,
      paddingTop: theme.spacing(0.5),
      paddingBottom: theme.spacing(0.5),
      boxSizing: 'border-box',
      maxWidth: '100%',
    },
    listItem: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    jobBody: {
      minWidth: 0,
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
    },
    jobLineText: {
      overflowWrap: 'break-word',
      wordBreak: 'break-word',
    },
    datesLine: {
      marginTop: theme.spacing(0.25),
    },
    progressArea: {
      marginTop: theme.spacing(1),
    },
    statusProgressLine: {
      textTransform: 'none',
      marginBottom: theme.spacing(0.75),
    },
    progress: {
      height: 6,
      borderRadius: theme.shape.borderRadius,
    },
    actions: {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      gap: theme.spacing(1),
      marginTop: theme.spacing(1),
    },
  }),
);

export default BatchMapExportJobRows;
