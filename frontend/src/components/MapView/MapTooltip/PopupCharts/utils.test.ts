import { ChartType, WMSLayerProps } from 'config/types';

import { hasChartAdminId } from './utils';

jest.mock('config', () => {
  const actual = jest.requireActual('config');
  return {
    ...actual,
    appConfig: { ...actual.appConfig, countryAdmin0Id: undefined },
  };
});

const chartLayer = {
  id: 'rainfall_dekad',
  title: '10-day rainfall estimate (mm)',
  chartData: {
    url: 'https://api.earthobservation.vam.wfp.org/stats/admin',
    type: ChartType.Line,
    fields: [],
    levels: [
      { level: '0', id: 'dv_adm0_id', name: 'dv_adm0_name' },
      { level: '1', id: 'dv_adm1_id', name: 'dv_adm1_name' },
      { level: '2', id: 'dv_adm2_id', name: 'dv_adm2_name' },
    ],
  },
} as unknown as WMSLayerProps;

describe('hasChartAdminId', () => {
  it('returns true when the feature has a dv_adm id for the chart level', () => {
    expect(
      hasChartAdminId(
        chartLayer,
        { dv_adm0_id: 70015, adm0_name: 'South Sudan' },
        0,
        undefined,
      ),
    ).toBe(true);
  });

  it('returns false when the feature has no dv_adm id and no country fallback', () => {
    expect(
      hasChartAdminId(
        chartLayer,
        { adm0_name: 'Abyei', adm0_id: 999, iso3: 'xAB' },
        0,
        undefined,
      ),
    ).toBe(false);
  });

  it('returns true when the feature has no dv_adm id but a country fallback exists', () => {
    expect(
      hasChartAdminId(chartLayer, { adm0_name: 'Mozambique' }, 0, 170),
    ).toBe(true);
  });

  it('returns true when properties are undefined to preserve the legacy popup path', () => {
    expect(hasChartAdminId(chartLayer, undefined, 0, undefined)).toBe(true);
  });
});
