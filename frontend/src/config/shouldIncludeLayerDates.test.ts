import { LayerType, MenuGroup, shouldIncludeLayerDates } from './types';

const rainfallGroup: MenuGroup = {
  groupTitle: 'Rainfall aggregate',
  activateAll: false,
  layers: [
    { id: 'rainfall_dekad', label: '10-day', main: true },
    { id: 'rainfall_daily', label: 'Daily' },
    { id: 'rainfall_agg_1month', label: '1-month' },
  ],
};

const layer = (id: string, group?: MenuGroup): LayerType =>
  ({ id, type: 'wms', ...(group ? { group } : {}) }) as LayerType;

describe('shouldIncludeLayerDates', () => {
  test('includes a layer with no group', () => {
    const selected = [layer('admin_boundaries')];

    expect(shouldIncludeLayerDates('admin_boundaries', selected)).toBe(true);
  });

  test('includes a group main layer', () => {
    const selected = [layer('rainfall_dekad', rainfallGroup)];

    expect(shouldIncludeLayerDates('rainfall_dekad', selected)).toBe(true);
  });

  test('includes a non-main layer when its group main layer is off', () => {
    const selected = [layer('rainfall_daily', rainfallGroup)];

    expect(shouldIncludeLayerDates('rainfall_daily', selected)).toBe(true);
  });

  test('drops a non-main layer when its group main layer is also on', () => {
    const selected = [
      layer('rainfall_dekad', rainfallGroup),
      layer('rainfall_daily', rainfallGroup),
    ];

    expect(shouldIncludeLayerDates('rainfall_daily', selected)).toBe(false);
    expect(shouldIncludeLayerDates('rainfall_dekad', selected)).toBe(true);
  });
});
