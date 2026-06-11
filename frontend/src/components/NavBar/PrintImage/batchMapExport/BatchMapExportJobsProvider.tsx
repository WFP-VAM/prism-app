import { addNotification } from 'context/notificationStateSlice';
import { useSafeTranslation } from 'i18n';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  cancelMapExportJob,
  createMapExportJob,
  waitForMapExportJobDownloadUrl,
} from 'utils/mapExportJobsApi';

import {
  BatchMapExportJobsActionsContext,
  BatchMapExportJobsStateContext,
} from './batchMapExportJobsContext';
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
  const abortByClientIdRef = useRef(new Map<string, AbortController>());
  const jobsRef = useRef<BatchMapExportJobRow[]>(jobs);
  jobsRef.current = jobs;

  const dismissBatchMapExportJob = useCallback((clientId: string) => {
    const snapshot = jobsRef.current.find(j => j.clientId === clientId);

    abortByClientIdRef.current.get(clientId)?.abort();
    abortByClientIdRef.current.delete(clientId);

    setJobs(prev => prev.filter(j => j.clientId !== clientId));

    if (snapshot?.serverJobId && snapshot.status === 'queued') {
      void cancelMapExportJob(snapshot.serverJobId).catch(() => {});
    }
  }, []);

  const enqueueBatchMapExportJob = useCallback(
    (payload: BatchMapExportEnqueuePayload) => {
      const clientId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `batch-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      const abortController = new AbortController();
      abortByClientIdRef.current.set(clientId, abortController);
      const signal = abortController.signal;

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
          downloadFilename: null,
          format: payload.format,
          error: null,
        },
      ]);

      void (async () => {
        try {
          const { job_id: serverJobId } = await createMapExportJob(
            {
              urls: payload.urls,
              viewportWidth: payload.viewportWidth,
              viewportHeight: payload.viewportHeight,
              format: payload.format,
              country: payload.country,
              ...(payload.adminArea ? { adminArea: payload.adminArea } : {}),
            },
            signal,
          );
          setJobs(prev =>
            prev.map(j =>
              j.clientId === clientId ? { ...j, serverJobId } : j,
            ),
          );

          const { downloadUrl, downloadFilename } =
            await waitForMapExportJobDownloadUrl(serverJobId, {
              pollIntervalMs: 2000,
              signal,
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
                          downloadFilename:
                            snap.download_filename ??
                            j.downloadFilename ??
                            null,
                        }
                      : j,
                  ),
                );
              },
            });

          setJobs(prev =>
            prev.map(j =>
              j.clientId === clientId
                ? {
                    ...j,
                    status: 'succeeded',
                    downloadUrl,
                    downloadFilename,
                  }
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
          if (err instanceof DOMException && err.name === 'AbortError') {
            return;
          }
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
        } finally {
          abortByClientIdRef.current.delete(clientId);
        }
      })();
    },
    [dispatch, t],
  );

  const actionsValue = useMemo(
    () => ({
      enqueueBatchMapExportJob,
      dismissBatchMapExportJob,
    }),
    [enqueueBatchMapExportJob, dismissBatchMapExportJob],
  );

  const stateValue = useMemo(() => ({ jobs }), [jobs]);

  return (
    <BatchMapExportJobsActionsContext.Provider value={actionsValue}>
      <BatchMapExportJobsStateContext.Provider value={stateValue}>
        {children}
      </BatchMapExportJobsStateContext.Provider>
    </BatchMapExportJobsActionsContext.Provider>
  );
}
