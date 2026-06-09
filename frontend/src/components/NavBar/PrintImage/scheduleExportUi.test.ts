import {
  isPrintPanelPrimaryDisabled,
  isSchedulePrimaryDisabled,
  schedulePrimaryButtonLabelKey,
} from './scheduleExportUi';

const baseState = {
  createScheduledMaps: true,
  isPrismAuthenticated: true,
  canManageSchedules: true,
  selectedLayerId: 'precip_blended_dekad',
  hasPreviewBounds: true,
};

describe('schedulePrimaryButtonLabelKey', () => {
  test('export mode uses Export label key', () => {
    expect(
      schedulePrimaryButtonLabelKey({
        ...baseState,
        createScheduledMaps: false,
      }),
    ).toBe('export');
  });

  test('authenticated schedule mode uses Create schedule label key', () => {
    expect(schedulePrimaryButtonLabelKey(baseState)).toBe('create_schedule');
  });

  test('unauthenticated schedule mode prompts login', () => {
    expect(
      schedulePrimaryButtonLabelKey({
        ...baseState,
        isPrismAuthenticated: false,
      }),
    ).toBe('login_to_create_schedule');
  });
});

describe('isSchedulePrimaryDisabled', () => {
  test('disabled without manage permission', () => {
    expect(
      isSchedulePrimaryDisabled({ ...baseState, canManageSchedules: false }),
    ).toBe(true);
  });

  test('disabled without layer or preview bounds', () => {
    expect(
      isSchedulePrimaryDisabled({ ...baseState, selectedLayerId: null }),
    ).toBe(true);
    expect(
      isSchedulePrimaryDisabled({ ...baseState, hasPreviewBounds: false }),
    ).toBe(true);
  });

  test('enabled for login flow when not authenticated', () => {
    expect(
      isSchedulePrimaryDisabled({
        ...baseState,
        isPrismAuthenticated: false,
      }),
    ).toBe(false);
  });
});

describe('isPrintPanelPrimaryDisabled', () => {
  test('schedule mode skips batch date-range requirement', () => {
    expect(
      isPrintPanelPrimaryDisabled({
        isDownloading: false,
        schedulePrimaryDisabled: false,
        createScheduledMaps: true,
        isPrismAuthenticated: true,
        batchMapsVisibility: true,
        hasCompleteDateRange: false,
      }),
    ).toBe(false);
  });

  test('batch export still requires a complete date range', () => {
    expect(
      isPrintPanelPrimaryDisabled({
        isDownloading: false,
        schedulePrimaryDisabled: false,
        createScheduledMaps: false,
        isPrismAuthenticated: true,
        batchMapsVisibility: true,
        hasCompleteDateRange: false,
      }),
    ).toBe(true);
  });
});
