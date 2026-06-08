/**
 * Regression test for the RBD (multi-country) charts bug where selecting a
 * location produced a request with `id_code=undefined`.
 *
 * The chart pipeline reads the admin code from the boundary feature properties
 * that the selector resolves (via getProperties) for the chosen admin level.
 * In multi-country deployments the "Admin 1" dropdown is actually the country
 * (chart level 0) and "Admin 2" is admin 1 (chart level 1); passing the
 * single-country levels (1, 2) made getProperties return {} and the id_code
 * came out undefined.
 */
import { fireEvent, render } from '@testing-library/react';
import { BoundaryLayerProps } from 'config/types';

// RBD-shaped boundary layer: includes admin 0 (country) as the first level.
const BOUNDARY_LAYER = {
  id: 'admin_boundaries',
  adminCode: 'admin2Pcod',
  adminLevelCodes: ['admin0Pcod', 'admin1Pcod', 'admin2Pcod'],
  adminLevelNames: ['admin0Name', 'admin1Name', 'admin2Name'],
  adminLevelLocalNames: ['admin0Name', 'admin1Name', 'admin2Name'],
} as unknown as BoundaryLayerProps;

const BOUNDARY_DATA = {
  features: [
    {
      properties: {
        admin0Pcod: 'ML',
        admin0Name: 'Mali',
        admin1Pcod: 'ML07',
        admin1Name: 'Gao',
        admin2Pcod: 'ML0701',
        admin2Name: 'Ansongo',
        dv_adm0_id: 155,
        dv_adm1_id: 1927,
        dv_adm2_id: 19375,
      },
    },
    {
      properties: {
        admin0Pcod: 'BF',
        admin0Name: 'Burkina Faso',
        admin1Pcod: 'BF46',
        admin1Name: 'Centre',
        admin2Pcod: 'BF4601',
        admin2Name: 'Kadiogo',
        dv_adm0_id: 42,
        dv_adm1_id: 900,
        dv_adm2_id: 9001,
      },
    },
  ],
} as any;

// Force a multi-country deployment regardless of the test runner's COUNTRY.
jest.mock('config', () => {
  const actual = jest.requireActual('config');
  return {
    ...actual,
    appConfig: { ...actual.appConfig, multiCountry: true },
  };
});
jest.mock('config/utils', () => ({
  ...jest.requireActual('config/utils'),
  getBoundaryLayersByAdminLevel: () => BOUNDARY_LAYER,
}));

// The global test setup stubs Material-UI components to strings, which makes
// the <TextField select> impossible to interact with. Replace the few pieces
// this component uses with native equivalents so onChange actually fires.
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

describe('ChartLocationSelector (multi-country / RBD)', () => {
  it('resolves a defined id_code when a country is selected', () => {
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

    // First (and only) dropdown is the country/"Admin 1" selector.
    const [admin1Select] = container.querySelectorAll('select');
    fireEvent.change(admin1Select, { target: { value: 'ML' } });

    expect(onAdmin1Change).toHaveBeenCalledTimes(1);
    const [code, properties, level] = onAdmin1Change.mock.calls[0];
    expect(code).toBe('ML');
    // Country selection => chart level 0, not 1.
    expect(level).toBe(0);
    // The regression: these were undefined because getProperties returned {}.
    expect(properties).not.toEqual({});
    expect(properties.dv_adm0_id).toBe(155);
  });

  it('resolves a defined id_code when an admin 1 area is selected', () => {
    const onAdmin2Change = jest.fn();

    const { container } = render(
      <ChartLocationSelector
        boundaryLayerData={BOUNDARY_DATA}
        boundaryLayer={BOUNDARY_LAYER}
        admin1Key={'ML' as any}
        admin2Key={'' as any}
        onAdmin1Change={jest.fn()}
        onAdmin2Change={onAdmin2Change}
      />,
    );

    // With a country selected, the second dropdown is the admin-1 selector.
    const selects = container.querySelectorAll('select');
    fireEvent.change(selects[1], { target: { value: 'ML07' } });

    expect(onAdmin2Change).toHaveBeenCalledTimes(1);
    const [code, properties, level] = onAdmin2Change.mock.calls[0];
    expect(code).toBe('ML07');
    expect(level).toBe(1);
    expect(properties).not.toEqual({});
    expect(properties.dv_adm1_id).toBe(1927);
  });
});
