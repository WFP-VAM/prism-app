import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { Dashboard } from 'config/types';
import type { RootState } from 'context/store';
import { saveDraftDashboards } from 'utils/draftDashboardStorage';

export function usePersistDraftDashboards(): void {
  const allDashboardsLength = useSelector(
    (s: RootState) => s.dashboardState.dashboards.length,
  );
  const drafts = useSelector((s: RootState) =>
    s.dashboardState.dashboards.filter(d => d.isDraft === true),
  );
  const latestDraftsRef = useRef<Dashboard[]>(drafts);
  latestDraftsRef.current = drafts;

  // Only write to localStorage after setDashboards has fired (dashboards are loaded).
  // Prevents overwriting with [] before the async fetch and localStorage merge completes —
  // which would happen on mount (Redux starts empty)
  const loadedRef = useRef(false);
  if (allDashboardsLength > 0) {
    loadedRef.current = true;
  }

  useEffect(() => {
    if (!loadedRef.current) {
      return undefined;
    }
    const timer = setTimeout(() => saveDraftDashboards(drafts), 500);
    return () => clearTimeout(timer);
  }, [drafts, allDashboardsLength]);

  useEffect(() => {
    return () => {
      if (loadedRef.current) {
        saveDraftDashboards(latestDraftsRef.current);
      }
    };
  }, []);
}
