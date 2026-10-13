import { ChartType, WMSLayerProps } from 'config/types';

import { getChartAdminCode } from './chart-admin-code';

jest.mock('config', () => {
  const actual = jest.requireActual('config');
  return {
    ...actual,
    appConfig: { ...actual.appConfig, countryAdmin0Id: undefined },
  };
});

// Single-country chart config: levels start at admin 1.
const chartLayer = {
  id: 'rainfall_dekad',
  chartData: {
    url: 'https://api.earthobservation.vam.wfp.org/stats/admin',
    type: ChartType.Bar,
    fields: [],
    levels: [
      { level: '1', id: 'dv_adm1_id', name: 'ADM1_EN' },
      { level: '2', id: 'dv_adm2_id', name: 'ADM2_EN' },
    ],
  },
} as unknown as WMSLayerProps;

describe('getChartAdminCode', () => {
  it('returns the dv_adm id for the requested level', () => {
    const properties = { dv_adm1_id: 900845, dv_adm2_id: 1009300 };
    expect(getChartAdminCode(chartLayer, properties, 1, 270)).toBe(900845);
    expect(getChartAdminCode(chartLayer, properties, 2, 270)).toBe(1009300);
  });

  it('falls back to the country id for the country level', () => {
    expect(getChartAdminCode(chartLayer, { dv_adm1_id: 1 }, 0, 270)).toBe(270);
  });

  it('returns undefined at the country level when there is no country id', () => {
    expect(
      getChartAdminCode(chartLayer, { dv_adm1_id: 1 }, 0, undefined),
    ).toBeUndefined();
  });

  it('does not fall back to the country id for a subnational level', () => {
    expect(
      getChartAdminCode(
        chartLayer,
        { dv_adm1_id: 900848, dv_adm2_id: null },
        2,
        270,
      ),
    ).toBeUndefined();
  });

  it('returns undefined for a level missing from the chart config', () => {
    expect(
      getChartAdminCode(chartLayer, { dv_adm3_id: 5 }, 3, 270),
    ).toBeUndefined();
  });
});
