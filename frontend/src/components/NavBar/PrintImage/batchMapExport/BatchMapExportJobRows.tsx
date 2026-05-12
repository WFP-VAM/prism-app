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
import { cyanBlue } from 'muiTheme';
import React, { useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { downloadBlobFromSignedUrl } from './downloadBlobFromSignedUrl';
import type { BatchMapExportJobRow } from './types';

type Props = {
  jobs: BatchMapExportJobRow[];
  onDismiss: (clientId: string) => void;
  variant: 'compact' | 'panel';
};

function mapProgressDisplay(job: BatchMapExportJobRow): {
  mapsCurrent: number;
  mapsTotal: number;
  barMode: 'determinate' | 'indeterminate';
  barValue: number;
} {
  const mapsTotal = Math.max(job.mapTotal, job.progressTotalFromApi ?? 0, 1);

  if (job.status === 'succeeded') {
    return {
      mapsCurrent: mapsTotal,
      mapsTotal,
      barMode: 'determinate',
      barValue: 100,
    };
  }
  if (
    job.progressCurrent != null &&
    job.progressTotalFromApi != null &&
    job.progressTotalFromApi > 0
  ) {
    const current = Math.min(job.progressCurrent, job.progressTotalFromApi);
    const pct = (current / job.progressTotalFromApi) * 100;
    return {
      mapsCurrent: current,
      mapsTotal: Math.max(job.progressTotalFromApi, job.mapTotal),
      barMode: 'determinate',
      barValue: Math.min(100, pct),
    };
  }
  return {
    mapsCurrent: 0,
    mapsTotal: job.mapTotal || mapsTotal,
    barMode: 'indeterminate',
    barValue: 0,
  };
}

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
        const { mapsCurrent, mapsTotal, barMode, barValue } =
          mapProgressDisplay(job);

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
                  {job.layerDisplayName}
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
                        message: job.status,
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
                        status: job.status,
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
                      onClick={() =>
                        void (async () => {
                          try {
                            await downloadBlobFromSignedUrl(
                              job.downloadUrl!,
                              job.downloadFilename,
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
                        })()
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
