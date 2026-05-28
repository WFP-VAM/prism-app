import {
  DashboardElementType,
  type DashboardMapConfig,
  type DashboardTextConfig,
} from 'config/types';
import { DashboardMapPosition } from 'dashboardConfig/dashboardEnums';

import dashboardReducer, {
  setDashboards,
  swapMapPosition,
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
});
