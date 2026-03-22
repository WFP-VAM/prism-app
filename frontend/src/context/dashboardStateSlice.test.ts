import dashboardReducer, { setDashboards } from './dashboardStateSlice';
import { DashboardElementType, type DashboardTextConfig } from 'config/types';

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
});
