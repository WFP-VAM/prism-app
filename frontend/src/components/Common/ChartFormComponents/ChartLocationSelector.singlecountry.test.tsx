/**
 * Single-country counterpart to ChartLocationSelector.multicountry.test.tsx.
 *
 * Confirms the dropdowns keep mapping to the 1-based admin levels (admin 1 =>
 * level 1, admin 2 => level 2) that single-country deployments expect, so the
 * multi-country fix doesn't regress the common case.
 */
import { fireEvent, render } from '@testing-library/react';
import { BoundaryLayerProps } from 'config/types';

// Single-country boundary layer: starts at admin 1 (no country level).
const BOUNDARY_LAYER = {
  id: 'admin_boundaries',
  adminCode: 'admin2Pcod',
  adminLevelCodes: ['admin1Pcod', 'admin2Pcod'],
  adminLevelNames: ['admin1Name', 'admin2Name'],
  adminLevelLocalNames: ['admin1Name', 'admin2Name'],
} as unknown as BoundaryLayerProps;

const BOUNDARY_DATA = {
  features: [
    {
      properties: {
        admin1Pcod: 'KH1',
        admin1Name: 'Banteay Meanchey',
        admin2Pcod: 'KH101',
        admin2Name: 'Mongkol Borei',
        dataviz_adm1_id: 11,
        dataviz_adm2_id: 1101,
      },
    },
    {
      properties: {
        admin1Pcod: 'KH2',
        admin1Name: 'Battambang',
        admin2Pcod: 'KH201',
        admin2Name: 'Banan',
        dataviz_adm1_id: 12,
        dataviz_adm2_id: 1201,
      },
    },
  ],
} as any;

// Force a single-country deployment regardless of the test runner's COUNTRY.
jest.mock('config', () => {
  const actual = jest.requireActual('config');
  return {
    ...actual,
    appConfig: { ...actual.appConfig, multiCountry: false },
  };
});

jest.mock('config/utils', () => ({
  ...jest.requireActual('config/utils'),
  getBoundaryLayersByAdminLevel: () => BOUNDARY_LAYER,
}));

jest.mock('hooks/useAdminNameTranslations', () => ({
  useAdminNameTranslations: () => ({
    language: 'en',
    scope: 'common',
    dict: undefined,
    status: 'idle',
  }),
}));

jest.mock('@material-ui/core', () => {
  const React = require('react');
  const actual = jest.requireActual('@material-ui/core');
  return {
    ...actual,
    Box: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
    Typography: ({ children }: any) =>
      React.createElement('div', null, children),
    MenuItem: ({ value, children }: any) =>
      React.createElement('option', { value }, children),
    TextField: ({ label, value, onChange, children }: any) =>
      React.createElement(
        'select',
        { 'aria-label': label, value: value ?? '', onChange },
        children,
      ),
  };
});

import ChartLocationSelector from './ChartLocationSelector';

describe('ChartLocationSelector (single-country)', () => {
  it('maps the admin 1 dropdown to chart level 1', () => {
    const onAdmin1Change = jest.fn();

    const { container } = render(
      <ChartLocationSelector
        boundaryLayerData={BOUNDARY_DATA}
        boundaryLayer={BOUNDARY_LAYER}
        admin1Key={'' as any}
        admin2Key={'' as any}
        onAdmin1Change={onAdmin1Change}
        onAdmin2Change={jest.fn()}
      />,
    );

    const [admin1Select] = container.querySelectorAll('select');
    fireEvent.change(admin1Select, { target: { value: 'KH1' } });

    expect(onAdmin1Change).toHaveBeenCalledTimes(1);
    const [code, properties, level] = onAdmin1Change.mock.calls[0];
    expect(code).toBe('KH1');
    expect(level).toBe(1);
    expect(properties).not.toEqual({});
    expect(properties.dataviz_adm1_id).toBe(11);
  });

  it('maps the admin 2 dropdown to chart level 2', () => {
    const onAdmin2Change = jest.fn();

    const { container } = render(
      <ChartLocationSelector
        boundaryLayerData={BOUNDARY_DATA}
        boundaryLayer={BOUNDARY_LAYER}
        admin1Key={'KH1' as any}
        admin2Key={'' as any}
        onAdmin1Change={jest.fn()}
        onAdmin2Change={onAdmin2Change}
      />,
    );

    const selects = container.querySelectorAll('select');
    fireEvent.change(selects[1], { target: { value: 'KH101' } });

    expect(onAdmin2Change).toHaveBeenCalledTimes(1);
    const [code, properties, level] = onAdmin2Change.mock.calls[0];
    expect(code).toBe('KH101');
    expect(level).toBe(2);
    expect(properties).not.toEqual({});
    expect(properties.dataviz_adm2_id).toBe(1101);
  });
});
