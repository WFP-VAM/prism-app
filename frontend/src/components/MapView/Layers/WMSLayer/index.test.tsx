import '@testing-library/jest-dom';

import { render } from '@testing-library/react';
import { ClipContext } from 'components/MapExport/clipContext';
import { WMSLayerProps } from 'config/types';
import type { Feature, Polygon } from 'geojson';

import WMSLayer from './index';

let capturedSourceProps: { tiles?: string[] } | null = null;

jest.mock('react-map-gl/maplibre', () => {
  const React = require('react');
  return {
    __esModule: true,
    Source: (props: { tiles?: string[] }) => {
      capturedSourceProps = props;
      return React.createElement('div', { 'data-testid': 'mock-source' });
    },
    Layer: () => 'mock-Layer',
  };
});

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector: (state: unknown) => unknown) =>
    selector({
      serverState: {
        availableDates: { test_wms: [new Date('2024-05-15').getTime()] },
      },
      opacityState: {
        opacityMap: { test_wms: { value: 0.8 } },
      },
    }),
  ),
}));

jest.mock('utils/useDefaultDate', () => ({
  useDefaultDate: () => Date.now(),
}));

const mockClipPolygon: Feature<Polygon> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ],
  },
};

const testLayer: WMSLayerProps = {
  id: 'test_wms',
  type: 'wms',
  title: 'Test WMS',
  baseUrl: 'https://api.example.com/ows',
  serverLayerName: 'test_layer',
  additionalQueryParams: {},
  opacity: 0.8,
};

describe('WMSLayer clip wiring', () => {
  beforeEach(() => {
    capturedSourceProps = null;
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-05-15'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('passes plain tile URLs when no clip context is active', () => {
    render(<WMSLayer layer={testLayer} />);

    expect(capturedSourceProps?.tiles).toHaveLength(1);
    const tileUrl = capturedSourceProps!.tiles![0];
    expect(tileUrl).not.toMatch(/^clip:\/\//);
    expect(tileUrl).toContain('bbox={bbox-epsg-3857}');
  });

  it('prefixes tile URLs with clip:// when clip context is active', () => {
    const clipId = 'abc123';

    render(
      <ClipContext.Provider value={{ clipPolygon: mockClipPolygon, clipId }}>
        <WMSLayer layer={testLayer} />
      </ClipContext.Provider>,
    );

    expect(capturedSourceProps?.tiles).toHaveLength(1);
    const tileUrl = capturedSourceProps!.tiles![0];
    expect(tileUrl).toMatch(
      new RegExp(`^clip://${clipId}/https://api\\.example\\.com/ows`),
    );
    expect(tileUrl).toContain('bbox={bbox-epsg-3857}');
  });
});
