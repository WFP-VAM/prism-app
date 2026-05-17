import type { Dashboard } from 'config/types';
import {
  formatDashboardValidationError,
  validateDashboardConfig,
} from 'dashboardConfig/schema';

export const DRAFT_STORAGE_KEY = 'prism_draft_dashboards';

export function saveDraftDashboards(drafts: Dashboard[]): void {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  } catch (e) {
    console.warn('Failed to persist draft dashboards:', e);
  }
}

export function loadDraftDashboards(): Dashboard[] {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    const result = validateDashboardConfig(parsed);
    if (!result.success) {
      console.warn(
        'Stored drafts failed validation:',
        formatDashboardValidationError(result.error),
      );
      return [];
    }
    return result.data.filter(d => d.isDraft === true);
  } catch (e) {
    console.warn('Failed to load draft dashboards:', e);
    return [];
  }
}
