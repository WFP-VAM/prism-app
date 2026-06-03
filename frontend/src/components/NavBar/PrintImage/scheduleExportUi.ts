export type SchedulePrimaryState = {
  createScheduledMaps: boolean;
  isPrismAuthenticated: boolean;
  canManageSchedules: boolean;
  selectedLayerId: string | null;
  hasPreviewBounds: boolean;
};

export type SchedulePrimaryButtonLabelKey =
  | 'export'
  | 'create_schedule'
  | 'login_to_create_schedule';

export function schedulePrimaryButtonLabelKey(
  state: SchedulePrimaryState,
): SchedulePrimaryButtonLabelKey {
  if (!state.createScheduledMaps) {
    return 'export';
  }
  return state.isPrismAuthenticated
    ? 'create_schedule'
    : 'login_to_create_schedule';
}

export function isSchedulePrimaryDisabled(
  state: SchedulePrimaryState,
): boolean {
  return (
    state.createScheduledMaps &&
    state.isPrismAuthenticated &&
    (!state.canManageSchedules ||
      !state.selectedLayerId ||
      !state.hasPreviewBounds)
  );
}

export function isPrintPanelPrimaryDisabled(options: {
  isDownloading: boolean;
  schedulePrimaryDisabled: boolean;
  createScheduledMaps: boolean;
  isPrismAuthenticated: boolean;
  batchMapsVisibility: boolean;
  hasCompleteDateRange: boolean;
}): boolean {
  if (options.isDownloading) {
    return true;
  }
  if (options.schedulePrimaryDisabled) {
    return true;
  }
  if (options.createScheduledMaps && !options.isPrismAuthenticated) {
    return false;
  }
  return (
    options.batchMapsVisibility &&
    !options.createScheduledMaps &&
    !options.hasCompleteDateRange
  );
}
