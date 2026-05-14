import { addNotification } from 'context/notificationStateSlice';
import { useSafeTranslation } from 'i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  createMapExportJob,
  waitForMapExportJobDownloadUrl,
} from 'utils/mapExportJobsApi';

import { BatchMapExportJobsContext } from './batchMapExportJobsContext';
import type {
  BatchMapExportEnqueuePayload,
  BatchMapExportJobRow,
} from './types';

export default function BatchMapExportJobsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [jobs, setJobs] = useState<BatchMapExportJobRow[]>([]);
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();

  const dismissBatchMapExportJob = useCallback((clientId: string) => {
    setJobs(prev => prev.filter(j => j.clientId !== clientId));
  }, []);

  const enqueueBatchMapExportJob = useCallback(
    (payload: BatchMapExportEnqueuePayload) => {
      const clientId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `batch-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      dispatch(
        addNotification({
          type: 'info',
          message: t(
            'Batch export started. This may take several minutes; a popup will appear when the file is ready.',
          ),
        }),
      );

      setJobs(prev => [
        ...prev,
        {
          clientId,
          serverJobId: null,
          status: 'queued',
          progressCurrent: null,
          progressTotalFromApi: null,
          mapTotal: payload.mapTotal,
          downloadUrl: null,
          layerDisplayName: payload.layerDisplayName,
          datesSummary: payload.datesSummary,
          downloadFilename: payload.downloadFilename,
          format: payload.format,
          error: null,
        },
      ]);

      void (async () => {
        try {
          const { job_id: serverJobId } = await createMapExportJob({
            urls: payload.urls,
            viewportWidth: payload.viewportWidth,
            viewportHeight: payload.viewportHeight,
            format: payload.format,
          });
          setJobs(prev =>
            prev.map(j =>
              j.clientId === clientId ? { ...j, serverJobId } : j,
            ),
          );

          const downloadUrl = await waitForMapExportJobDownloadUrl(
            serverJobId,
            {
              pollIntervalMs: 2000,
              onJobUpdate: snap => {
                setJobs(prev =>
                  prev.map(j =>
                    j.clientId === clientId
                      ? {
                          ...j,
                          status: snap.status,
                          progressCurrent:
                            snap.progress_current ?? j.progressCurrent,
                          progressTotalFromApi:
                            snap.progress_total ?? j.progressTotalFromApi,
                        }
                      : j,
                  ),
                );
              },
            },
          );

          setJobs(prev =>
            prev.map(j =>
              j.clientId === clientId
                ? { ...j, status: 'succeeded', downloadUrl }
                : j,
            ),
          );
          dispatch(
            addNotification({
              type: 'success',
              message: t('Batch export is ready'),
            }),
          );
        } catch (err) {
          const msg =
            err instanceof Error
              ? err.message
              : t(
                  'Something went wrong with the batch download. Please try again.',
                );
          setJobs(prev =>
            prev.map(j =>
              j.clientId === clientId
                ? { ...j, status: 'failed', error: msg }
                : j,
            ),
          );
          dispatch(
            addNotification({
              type: 'error',
              message:
                err instanceof Error
                  ? t('Batch export failed: {{message}}', {
                      message: err.message,
                    })
                  : t(
                      'Something went wrong with the batch download. Please try again.',
                    ),
            }),
          );
          console.error('Batch download failed:', err);
        }
      })();
    },
    [dispatch, t],
  );

  const value = useMemo(
    () => ({
      jobs,
      enqueueBatchMapExportJob,
      dismissBatchMapExportJob,
    }),
    [jobs, enqueueBatchMapExportJob, dismissBatchMapExportJob],
  );

  return (
    <BatchMapExportJobsContext.Provider value={value}>
      {children}
    </BatchMapExportJobsContext.Provider>
  );
}
