import {
  ChartLatestPeriod,
  type DashboardChartConfig,
  DashboardElementType,
  type DashboardMapConfig,
  type DashboardTextConfig,
} from 'config/types';
import { DashboardMapPosition } from 'dashboardConfig/dashboardEnums';

import dashboardReducer, {
  setDashboards,
  setMapUseLatestDate,
  swapMapPosition,
  updateBlockConfig,
} from './dashboardStateSlice';

describe('dashboardStateSlice', () => {
  it('initial state has empty dashboards', () => {
    const state = dashboardReducer(undefined, { type: '@@INIT' });
    expect(state.dashboards).toEqual([]);
  });

  it('setDashboards stores list and resets view state', () => {
    const dashboards = [
      {
        title: 'One',
        path: 'one',
        firstColumn: [
          {
            type: DashboardElementType.TEXT,
            content: 'hi',
          } satisfies DashboardTextConfig,
        ],
      },
    ];
    const next = dashboardReducer(undefined, setDashboards(dashboards));
    expect(next.dashboards).toEqual(dashboards);
    expect(next.selectedDashboardIndex).toBe(0);
    expect(next.title).toBe('One');
  });

  it('swapMapPosition swaps firstColumn and secondColumn and remaps map state ids', () => {
    const dashboards = [
      {
        title: 'Draft',
        path: 'draft',
        isDraft: true,
        firstColumn: [
          {
            type: DashboardElementType.MAP,
            legendVisible: true,
            legendPosition: DashboardMapPosition.right,
            preSelectedMapLayers: [],
            useLatestAvailableDate: false,
          } satisfies DashboardMapConfig,
        ],
        secondColumn: [
          {
            type: DashboardElementType.TEXT,
            content: 'hello',
          } satisfies DashboardTextConfig,
        ],
      },
    ];
    let state = dashboardReducer(undefined, setDashboards(dashboards));

    expect(state.columns[0]?.[0]?.type).toBe(DashboardElementType.MAP);
    expect(state.columns[1]?.[0]?.type).toBe(DashboardElementType.TEXT);
    expect(state.mapStates['0-0']).toBeDefined();
    expect(state.mapStates['1-0']).toBeUndefined();

    state = dashboardReducer(state, swapMapPosition());

    expect(state.columns[0]?.[0]?.type).toBe(DashboardElementType.TEXT);
    expect(state.columns[1]?.[0]?.type).toBe(DashboardElementType.MAP);
    expect(state.mapStates['1-0']).toBeDefined();
    expect(state.mapStates['0-0']).toBeUndefined();

    const merged = state.dashboards[0];
    expect(merged?.firstColumn?.[0]?.type).toBe(DashboardElementType.TEXT);
    expect(merged?.secondColumn?.[0]?.type).toBe(DashboardElementType.MAP);
  });

  it('setMapUseLatestDate preserves pinned date when toggling latest mode', () => {
    const pinned = new Date('2024-12-21T12:00:00.000Z').getTime();
    const dashboards = [
      {
        title: 'Draft',
        path: 'draft',
        isDraft: true,
        firstColumn: [
          {
            type: DashboardElementType.MAP,
            date: '2024-12-21',
            useLatestAvailableDate: false,
            preSelectedMapLayers: [],
          } satisfies DashboardMapConfig,
        ],
      },
    ];
    let state = dashboardReducer(undefined, setDashboards(dashboards));
    state = {
      ...state,
      mapStates: {
        ...state.mapStates,
        '0-0': {
          ...state.mapStates['0-0'],
          dateRange: { startDate: pinned },
        },
      },
    };

    state = dashboardReducer(
      state,
      setMapUseLatestDate({ elementId: '0-0', value: true }),
    );
    expect(state.mapStates['0-0']?.useLatestAvailableDate).toBe(true);
    expect(state.mapStates['0-0']?.pinnedDate).toBe(pinned);
    expect(state.mapStates['0-0']?.dateRange).toEqual({});
    expect(state.dashboards[0]?.firstColumn?.[0]).toMatchObject({
      useLatestAvailableDate: true,
      date: undefined,
    });

    state = dashboardReducer(
      state,
      setMapUseLatestDate({ elementId: '0-0', value: false }),
    );
    expect(state.mapStates['0-0']?.useLatestAvailableDate).toBe(false);
    expect(state.mapStates['0-0']?.dateRange?.startDate).toBe(pinned);
    expect(state.mapStates['0-0']?.pinnedDate).toBeUndefined();
  });

  it('updateBlockConfig merges chart latest-date settings into draft config', () => {
    const dashboards = [
      {
        title: 'Draft',
        path: 'draft',
        isDraft: true,
        firstColumn: [
          {
            type: DashboardElementType.CHART,
            startDate: '2025-01-01',
            endDate: '2025-04-01',
            layerId: 'precip_blended_dekad',
            useLatestAvailableDate: false,
            latestPeriod: ChartLatestPeriod.MONTH,
          } satisfies DashboardChartConfig,
        ],
      },
    ];
    let state = dashboardReducer(undefined, setDashboards(dashboards));

    state = dashboardReducer(
      state,
      updateBlockConfig({
        columnIndex: 0,
        elementIndex: 0,
        updates: {
          useLatestAvailableDate: true,
          latestPeriod: ChartLatestPeriod.QUARTER,
          startDate: undefined,
          endDate: undefined,
        },
      }),
    );

    const chart = state.columns[0]?.[0];
    expect(chart?.type).toBe(DashboardElementType.CHART);
    if (chart?.type === DashboardElementType.CHART) {
      expect(chart.useLatestAvailableDate).toBe(true);
      expect(chart.latestPeriod).toBe(ChartLatestPeriod.QUARTER);
      expect(chart.startDate).toBeUndefined();
      expect(chart.endDate).toBeUndefined();
    }
    expect(state.dashboards[0]?.firstColumn?.[0]).toEqual(chart);
  });
});
