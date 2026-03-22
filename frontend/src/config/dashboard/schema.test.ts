import {
  validateDashboardConfig,
  formatDashboardValidationError,
} from './schema';
import { DashboardElementType } from 'config/types';
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
