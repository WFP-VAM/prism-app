import {
  validateDashboardConfig,
  formatDashboardValidationError,
} from './schema';
import { ChartHeight, DashboardElementType } from 'config/types';
import { DashboardMapPosition } from './dashboardEnums';
import dashboardConfigSample from 'test/fixtures/dashboard-config.sample.json';

const minimalValidDashboard = [
  {
    title: 'Test',
    firstColumn: [
      {
        type: DashboardElementType.TEXT,
        content: 'Hello',
      },
    ],
  },
];

/**
 * Invalid payloads for `validateDashboardConfig`: each row is a distinct way the
 * schema can fail (wrong root shape, missing required fields, unknown element
 * `type`, TABLE missing required `stat`, etc.).
 */
const INVALID_DASHBOARD_CONFIG_CASES: ReadonlyArray<{
  description: string;
  raw: unknown;
}> = [
  { description: 'null root', raw: null },
  { description: 'root is object, not array', raw: {} },
  { description: 'array entry is empty object', raw: [{}] },
  { description: 'dashboard missing title', raw: [{ firstColumn: [] }] },
  { description: 'dashboard missing firstColumn', raw: [{ title: 'x' }] },
  {
    description: 'element has unknown type discriminator',
    raw: [{ title: 'x', firstColumn: [{ type: 'BOGUS' }] }],
  },
  {
    description: 'TABLE element missing required stat',
    raw: [
      {
        title: 'x',
        firstColumn: [
          {
            type: DashboardElementType.TABLE,
            startDate: '2025-01-01',
            hazardLayerId: 'a',
            baselineLayerId: 'b',
          },
        ],
      },
    ],
  },
];

describe('validateDashboardConfig', () => {
  it('accepts full sample fixture (test/fixtures/dashboard-config.sample.json)', () => {
    const result = validateDashboardConfig(dashboardConfigSample);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('accepts minimal valid dashboard list', () => {
    const result = validateDashboardConfig(minimalValidDashboard);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].path).toBeTruthy();
      expect(result.data[0].firstColumn[0].type).toBe(
        DashboardElementType.TEXT,
      );
    }
  });

  it('applies README default values for optional dashboard and element fields', () => {
    const result = validateDashboardConfig([
      {
        title: 'Defaults',
        firstColumn: [
          {
            type: DashboardElementType.MAP,
            preSelectedMapLayers: [{ layerId: 'x' }],
          },
          {
            type: DashboardElementType.CHART,
            startDate: '2025-01-01',
            layerId: 'y',
          },
          {
            type: DashboardElementType.TABLE,
            startDate: '2025-01-01',
            hazardLayerId: 'h',
            baselineLayerId: 'b',
            stat: 'mean',
          },
        ],
      },
    ]);
    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    const row = result.data[0];
    expect(row.isEditable).toBe(false);
    const [mapEl, chartEl, tableEl] = row.firstColumn;
    expect(mapEl.type).toBe(DashboardElementType.MAP);
    if (mapEl.type === DashboardElementType.MAP) {
      expect(mapEl.legendVisible).toBe(true);
      expect(mapEl.legendPosition).toBe(DashboardMapPosition.right);
      expect(mapEl.preSelectedMapLayers[0].opacity).toBe(1);
    }
    expect(chartEl.type).toBe(DashboardElementType.CHART);
    if (chartEl.type === DashboardElementType.CHART) {
      expect(chartEl.chartHeight).toBe(ChartHeight.TALL);
    }
    expect(tableEl.type).toBe(DashboardElementType.TABLE);
    if (tableEl.type === DashboardElementType.TABLE) {
      expect(tableEl.maxRows).toBe(10);
      expect(tableEl.addResultToMap).toBe(true);
      expect(tableEl.sortColumn).toBe('name');
      expect(tableEl.sortOrder).toBe('asc');
    }
  });

  it('accepts MAP with omitted preSelectedMapLayers (defaults to [])', () => {
    const result = validateDashboardConfig([
      {
        title: 'M',
        firstColumn: [
          {
            type: DashboardElementType.MAP,
            title: 'Map',
          },
        ],
      },
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      const map = result.data[0].firstColumn[0];
      expect(map.type).toBe(DashboardElementType.MAP);
      if (map.type === DashboardElementType.MAP) {
        expect(map.preSelectedMapLayers).toEqual([]);
      }
    }
  });

  it.each(INVALID_DASHBOARD_CONFIG_CASES)(
    'rejects when $description',
    ({ raw }) => {
      const result = validateDashboardConfig(raw);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    },
  );

  it('formatDashboardValidationError includes paths', () => {
    const result = validateDashboardConfig({ not: 'array' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = formatDashboardValidationError(result.error);
      expect(msg).toMatch(/Invalid dashboard configuration/);
    }
  });
});
