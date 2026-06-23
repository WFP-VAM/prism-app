import '@testing-library/jest-dom';

import { createTheme, ThemeProvider } from '@material-ui/core';
import { render } from '@testing-library/react';
import { store } from 'context/store';
import { Provider } from 'react-redux';

import MapExportLayout from './MapExportLayout';
import { AspectRatio, MapExportToggles } from './types';

jest.mock('react-map-gl/maplibre', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'map-gl' }, children),
    Layer: () => 'mock-Layer',
    Source: () => 'mock-Source',
    Marker: () => 'mock-Marker',
  };
});

jest.mock('components/MapView/Legends/LegendItemsList', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({
      legendGraphicDpi,
      listStyle,
    }: {
      legendGraphicDpi?: number;
      listStyle?: string;
    }) =>
      React.createElement('div', {
        'data-testid': 'legend-items',
        'data-legend-graphic-dpi': legendGraphicDpi,
        className: listStyle,
      }),
  };
});

jest.mock('utils/map-utils', () => ({
  useAAMarkerScalePercent: () => 1,
  getLayerMapId: (id: string, type?: string) =>
    `layer-${id}${type ? `-${type}` : ''}`,
  isLayerOnView: () => false,
  firstBoundaryOnView: () => undefined,
}));

jest.mock('utils/useOnResizeObserver', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => [
      React.createRef(),
      { width: 800, height: 600 }, // Mock container dimensions for tests
    ],
  };
});

jest.mock(
  'components/MapView/Layers/AnticipatoryActionFloodLayer/FloodStationMarker',
  () => ({
    FloodStationMarker: () => 'mock-FloodStationMarker',
  }),
);

const defaultToggles: MapExportToggles = {
  fullLayerDescription: false,
  countryMask: false,
  mapLabelsVisibility: true,
  logoVisibility: true,
  legendVisibility: true,
  footerVisibility: true,
};

const defaultProps = {
  toggles: defaultToggles,
  aspectRatio: 'Auto' as AspectRatio,
  onMapDimensionsChange: jest.fn(),
  onBoundsChange: jest.fn(),
  titleText: '',
  footerText: '',
  footerTextSize: 12,
  logoPosition: 0,
  logoScale: 1,
  legendPosition: 0,
  legendScale: 1,
  mapStyle: 'mock-style',
};

describe('MapExportLayout', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-12-01'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('shows title when titleText provided', () => {
    const { getByText } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout {...defaultProps} titleText="Test Export Title" />
        </ThemeProvider>
      </Provider>,
    );
    expect(getByText('Test Export Title')).toBeInTheDocument();
  });

  test('hides title when titleText empty', () => {
    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout {...defaultProps} titleText="" />
        </ThemeProvider>
      </Provider>,
    );
    expect(container.querySelector('.titleOverlay')).not.toBeInTheDocument();
  });

  test('shows logo when logoVisibility is true and logo provided', () => {
    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout
            {...defaultProps}
            logo="test-logo.png"
            titleText="Test Title"
          />
        </ThemeProvider>
      </Provider>,
    );
    const logoImg = container.querySelector('img[alt="logo"]');
    expect(logoImg).toBeInTheDocument();
  });

  test('hides logo when logoVisibility is false', () => {
    const toggles = { ...defaultToggles, logoVisibility: false };
    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout
            {...defaultProps}
            toggles={toggles}
            logo="test-logo.png"
            titleText="Test Title"
          />
        </ThemeProvider>
      </Provider>,
    );
    const logoImg = container.querySelector('img[alt="logo"]');
    expect(logoImg).not.toBeInTheDocument();
  });

  test('positions logo left when logoPosition is 0', () => {
    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout
            {...defaultProps}
            logo="test-logo.png"
            logoPosition={0}
            titleText="Test Title"
          />
        </ThemeProvider>
      </Provider>,
    );
    const logoImg = container.querySelector('img[alt="logo"]') as HTMLElement;
    expect(logoImg?.style.left).toBe('8px');
    expect(logoImg?.style.right).toBe('auto');
  });

  test('positions logo right when logoPosition is 1', () => {
    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout
            {...defaultProps}
            logo="test-logo.png"
            logoPosition={1}
            titleText="Test Title"
          />
        </ThemeProvider>
      </Provider>,
    );
    const logoImg = container.querySelector('img[alt="logo"]') as HTMLElement;
    expect(logoImg?.style.left).toBe('auto');
    expect(logoImg?.style.right).toBe('8px');
  });

  test('shows legend when legendVisibility is true', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout {...defaultProps} />
        </ThemeProvider>
      </Provider>,
    );
    expect(getByTestId('legend-items')).toBeInTheDocument();
  });

  test('hides legend when legendVisibility is false', () => {
    const toggles = { ...defaultToggles, legendVisibility: false };
    const { queryByTestId } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout {...defaultProps} toggles={toggles} />
        </ThemeProvider>
      </Provider>,
    );
    expect(queryByTestId('legend-items')).not.toBeInTheDocument();
  });

  test('shows footer when footerVisibility is true and footerText provided', () => {
    const { getByText } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout {...defaultProps} footerText="Test Footer" />
        </ThemeProvider>
      </Provider>,
    );
    expect(getByText('Test Footer')).toBeInTheDocument();
  });

  test('hides footer when footerVisibility is false', () => {
    const toggles = { ...defaultToggles, footerVisibility: false };
    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout
            {...defaultProps}
            toggles={toggles}
            footerText="Test Footer"
          />
        </ThemeProvider>
      </Provider>,
    );
    expect(container.querySelector('.footerOverlay')).not.toBeInTheDocument();
  });

  const mockPolygon = {
    type: 'Feature',
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
    properties: {},
  };

  test('renders a single map (no overlay maps) when countryMask is enabled', () => {
    const toggles = { ...defaultToggles, countryMask: true };

    const { getAllByTestId } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout
            {...defaultProps}
            toggles={toggles}
            adminAreaClipPolygon={mockPolygon as any}
          />
        </ThemeProvider>
      </Provider>,
    );

    // Source-level clipping renders everything on one map rather than the old
    // base + data + boundaries + labels overlay stack.
    expect(getAllByTestId('map-gl')).toHaveLength(1);
  });

  test('applies logo scale correctly', () => {
    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout
            {...defaultProps}
            logo="test-logo.png"
            logoScale={1.5}
            titleText="Test Title"
          />
        </ThemeProvider>
      </Provider>,
    );
    const logoImg = container.querySelector('img[alt="logo"]') as HTMLElement;
    // logoHeight = 32 * 1.5 = 48
    expect(logoImg?.style.height).toBe('48px');
  });

  test('applies legend scale via CSS transform in print preview', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout {...defaultProps} legendScale={0.7} />
        </ThemeProvider>
      </Provider>,
    );
    const legendContainer = getByTestId('legend-items').parentElement;
    expect(legendContainer?.style.transform).toBe('scale(0.7)');
    expect(legendContainer?.style.transformOrigin).toBe('top left');
    expect(getByTestId('legend-items')).not.toHaveAttribute(
      'data-legend-graphic-dpi',
    );
  });

  test('uses the same CSS transform for server export and requests high-DPI WMS legends', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout
            {...defaultProps}
            legendScale={0.7}
            signalExportReady
          />
        </ThemeProvider>
      </Provider>,
    );
    const legendContainer = getByTestId('legend-items').parentElement;
    expect(legendContainer?.style.transform).toBe('scale(0.7)');
    expect(getByTestId('legend-items')).toHaveAttribute(
      'data-legend-graphic-dpi',
      '192',
    );
  });

  test('positions legend top-left when legendPosition is 0', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout {...defaultProps} legendPosition={0} />
        </ThemeProvider>
      </Provider>,
    );
    const legend = getByTestId('legend-items').parentElement as HTMLElement;
    expect(legend.style.left).toBe('8px');
    expect(legend.style.right).toBe('auto');
    expect(legend.style.top).not.toBe('');
    expect(legend.style.bottom).toBe('auto');
    expect(legend.style.transformOrigin).toBe('top left');
  });

  test('positions legend top-right when legendPosition is 1', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout {...defaultProps} legendPosition={1} />
        </ThemeProvider>
      </Provider>,
    );
    const legend = getByTestId('legend-items').parentElement as HTMLElement;
    expect(legend.style.left).toBe('auto');
    expect(legend.style.right).toBe('8px');
    expect(legend.style.top).not.toBe('');
    expect(legend.style.bottom).toBe('auto');
    expect(legend.style.transformOrigin).toBe('top right');
  });

  test('positions legend bottom-left when legendPosition is 2', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout {...defaultProps} legendPosition={2} />
        </ThemeProvider>
      </Provider>,
    );
    const legend = getByTestId('legend-items').parentElement as HTMLElement;
    expect(legend.style.left).toBe('8px');
    expect(legend.style.right).toBe('auto');
    expect(legend.style.top).toBe('auto');
    // (footerHeight || 20) + 10, no bottom logo clearance
    expect(legend.style.bottom).toBe('30px');
    expect(legend.style.transformOrigin).toBe('bottom left');
    // The inner list must anchor to the bottom so it grows upward (not hidden
    // behind the footer).
    expect(getByTestId('legend-items').className).toMatch(
      /legendListStyleBottom/,
    );
  });

  test('positions legend bottom-right when legendPosition is 3', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout {...defaultProps} legendPosition={3} />
        </ThemeProvider>
      </Provider>,
    );
    const legend = getByTestId('legend-items').parentElement as HTMLElement;
    expect(legend.style.left).toBe('auto');
    expect(legend.style.right).toBe('8px');
    expect(legend.style.top).toBe('auto');
    expect(legend.style.bottom).toBe('30px');
    expect(legend.style.transformOrigin).toBe('bottom right');
  });

  test('lifts a bottom-left legend above the bottom logo', () => {
    const toggles = { ...defaultToggles, bottomLogoVisibility: true };
    const { getByTestId } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout
            {...defaultProps}
            toggles={toggles}
            bottomLogo="test-bottom-logo.png"
            legendPosition={2}
          />
        </ThemeProvider>
      </Provider>,
    );
    const legend = getByTestId('legend-items').parentElement as HTMLElement;
    // base 30 + clearance (32 logo height + 14 gap) = 76
    expect(legend.style.bottom).toBe('76px');
  });

  test('keeps north arrow bottom-right unless legend is bottom-right', () => {
    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout {...defaultProps} legendPosition={2} />
        </ThemeProvider>
      </Provider>,
    );
    const northArrow = container.querySelector(
      'img[alt="northArrow"]',
    ) as HTMLElement;
    expect(northArrow.style.right).toBe('10px');
    expect(northArrow.style.left).toBe('auto');
  });

  test('moves north arrow to bottom-left when legend is bottom-right', () => {
    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout {...defaultProps} legendPosition={3} />
        </ThemeProvider>
      </Provider>,
    );
    const northArrow = container.querySelector(
      'img[alt="northArrow"]',
    ) as HTMLElement;
    expect(northArrow.style.left).toBe('10px');
    expect(northArrow.style.right).toBe('auto');
  });

  const withInjectedScaleBar = (cb: (scale: HTMLElement) => void) => {
    const scale = document.createElement('div');
    scale.className = 'maplibregl-ctrl maplibregl-ctrl-scale';
    document.body.appendChild(scale);
    try {
      cb(scale);
    } finally {
      scale.parentElement?.removeChild(scale);
    }
  };

  test('relocates the scale bar under the north arrow (bottom-left) when legend is bottom-right', () => {
    withInjectedScaleBar(scale => {
      const { getByTestId } = render(
        <Provider store={store}>
          <ThemeProvider theme={createTheme()}>
            <MapExportLayout {...defaultProps} legendPosition={3} />
          </ThemeProvider>
        </Provider>,
      );
      const anchor = getByTestId('scale-anchor');
      // scale bar pulled out of MapLibre's group into our anchor
      expect(scale.parentElement).toBe(anchor);
      // anchor shares the north arrow's left edge
      expect(anchor.style.left).toBe('10px');
      expect(anchor.style.right).toBe('auto');
    });
  });

  test('keeps the relocated scale bar on the right for other legend positions', () => {
    withInjectedScaleBar(scale => {
      const { getByTestId } = render(
        <Provider store={store}>
          <ThemeProvider theme={createTheme()}>
            <MapExportLayout {...defaultProps} legendPosition={2} />
          </ThemeProvider>
        </Provider>,
      );
      const anchor = getByTestId('scale-anchor');
      expect(scale.parentElement).toBe(anchor);
      expect(anchor.style.right).toBe('10px');
      expect(anchor.style.left).toBe('auto');
    });
  });

  test('keeps the scale bar aligned directly beneath the north arrow', () => {
    withInjectedScaleBar(() => {
      const { getByTestId, container } = render(
        <Provider store={store}>
          <ThemeProvider theme={createTheme()}>
            <MapExportLayout {...defaultProps} legendPosition={3} />
          </ThemeProvider>
        </Provider>,
      );
      const anchor = getByTestId('scale-anchor');
      const northArrow = container.querySelector(
        'img[alt="northArrow"]',
      ) as HTMLElement;
      // Same horizontal anchor, north arrow sits 30px above the scale bar.
      expect(anchor.style.left).toBe(northArrow.style.left);
      expect(anchor.style.right).toBe(northArrow.style.right);
      const arrowBottom = parseInt(northArrow.style.bottom, 10);
      const scaleBottom = parseInt(anchor.style.bottom, 10);
      expect(arrowBottom - scaleBottom).toBe(30);
    });
  });

  test('lifts the relocated north arrow above the bottom logo', () => {
    const toggles = { ...defaultToggles, bottomLogoVisibility: true };
    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout
            {...defaultProps}
            toggles={toggles}
            bottomLogo="test-bottom-logo.png"
            legendPosition={3}
          />
        </ThemeProvider>
      </Provider>,
    );
    const northArrow = container.querySelector(
      'img[alt="northArrow"]',
    ) as HTMLElement;
    // baseHeight (footerHeight||12 = 12, + 8 = 20) + 40 + clearance 46 = 106
    expect(northArrow.style.left).toBe('10px');
    expect(northArrow.style.bottom).toBe('106px');
  });

  test('applies footer text size correctly', () => {
    const { getByText } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout
            {...defaultProps}
            footerText="Test Footer"
            footerTextSize={16}
          />
        </ThemeProvider>
      </Provider>,
    );
    const footerText = getByText('Test Footer');
    expect(footerText).toHaveStyle({ fontSize: '16px' });
  });

  test('shows bottom logo when bottomLogoVisibility is true and bottomLogo provided', () => {
    const toggles = { ...defaultToggles, bottomLogoVisibility: true };
    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout
            {...defaultProps}
            toggles={toggles}
            bottomLogo="test-bottom-logo.png"
          />
        </ThemeProvider>
      </Provider>,
    );
    const bottomLogoImg = container.querySelector('img[alt="bottomLogo"]');
    expect(bottomLogoImg).toBeInTheDocument();
  });

  test('hides bottom logo when bottomLogoVisibility is false', () => {
    const toggles = { ...defaultToggles, bottomLogoVisibility: false };
    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout
            {...defaultProps}
            toggles={toggles}
            bottomLogo="test-bottom-logo.png"
          />
        </ThemeProvider>
      </Provider>,
    );
    const bottomLogoImg = container.querySelector('img[alt="bottomLogo"]');
    expect(bottomLogoImg).not.toBeInTheDocument();
  });

  test('hides bottom logo when bottomLogo is not provided', () => {
    const toggles = { ...defaultToggles, bottomLogoVisibility: true };
    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout {...defaultProps} toggles={toggles} />
        </ThemeProvider>
      </Provider>,
    );
    const bottomLogoImg = container.querySelector('img[alt="bottomLogo"]');
    expect(bottomLogoImg).not.toBeInTheDocument();
  });

  test('applies bottom logo scale correctly', () => {
    const toggles = { ...defaultToggles, bottomLogoVisibility: true };
    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout
            {...defaultProps}
            toggles={toggles}
            bottomLogo="test-bottom-logo.png"
            bottomLogoScale={1.5}
          />
        </ThemeProvider>
      </Provider>,
    );
    const bottomLogoImg = container.querySelector(
      'img[alt="bottomLogo"]',
    ) as HTMLElement;
    // bottomLogoHeight = 32 * 1.5 = 48
    expect(bottomLogoImg?.style.height).toBe('48px');
  });

  test('replaces {date} placeholder in title with formatted date when layerDate provided', () => {
    const { getByText } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout
            {...defaultProps}
            titleText="Test Title - {date}"
            layerDate="2024-09-30"
          />
        </ThemeProvider>
      </Provider>,
    );
    expect(getByText(/Test Title - 09-30-2024/)).toBeInTheDocument();
  });
});
