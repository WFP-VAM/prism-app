import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createTheme, ThemeProvider } from '@material-ui/core';
import { store } from 'context/store';
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
    default: () =>
      React.createElement(
        'div',
        { 'data-testid': 'legend-items' },
        'mock-LegendItemsList',
      ),
  };
});

jest.mock('utils/map-utils', () => ({
  useAAMarkerScalePercent: () => 1,
}));

jest.mock('utils/useOnResizeObserver', () => {
  // eslint-disable-next-line global-require
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
  initialViewState: {
    longitude: 0,
    latitude: 0,
    zoom: 5,
  },
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
          <MapExportLayout
            {...defaultProps}
            footerText="Test Footer"
            dateText="Publication date: 2024-12-01"
          />
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

  test('renders country mask when countryMask is true and polygon provided', () => {
    const toggles = { ...defaultToggles, countryMask: true };
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

    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout
            {...defaultProps}
            toggles={toggles}
            invertedAdminBoundaryLimitPolygon={mockPolygon as any}
          />
        </ThemeProvider>
      </Provider>,
    );
    // Source should be rendered for mask
    expect(container.textContent).toContain('mock-Source');
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

  test('applies legend scale correctly', () => {
    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapExportLayout {...defaultProps} legendScale={0.7} />
        </ThemeProvider>
      </Provider>,
    );
    const legendContainer = container.querySelector(
      '[data-testid="legend-items"]',
    )?.parentElement;
    expect(legendContainer?.style.transform).toBe('scale(0.7)');
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
});
