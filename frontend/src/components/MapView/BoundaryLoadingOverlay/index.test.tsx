import { createTheme, ThemeProvider } from '@mui/material/styles';
import { act, render, screen } from '@testing-library/react';
import { LayerKey } from 'config/types';

import BoundaryLoadingOverlay from '.';

const mockMaplibreMap = jest.fn();

jest.mock('utils/useMapState', () => ({
  useMapState: () => ({ maplibreMap: () => mockMaplibreMap() }),
}));

const theme = createTheme();

function createFakeMap({ sourcesLoaded = true } = {}) {
  const handlers: Record<string, ((...args: any[]) => void)[]> = {};
  return {
    sourcesLoaded,
    on(event: string, cb: (...args: any[]) => void) {
      (handlers[event] ||= []).push(cb);
    },
    off(event: string, cb: (...args: any[]) => void) {
      handlers[event] = (handlers[event] || []).filter(fn => fn !== cb);
    },
    getSource: () => ({}),
    isSourceLoaded() {
      return this.sourcesLoaded;
    },
    fireIdle() {
      (handlers.idle || []).forEach(cb => cb());
    },
  };
}

function renderOverlay(
  viewKey: string,
  displayedBoundaryLayerIds: LayerKey[] = ['universal_admin0_boundaries'],
) {
  return render(
    <ThemeProvider theme={theme}>
      <BoundaryLoadingOverlay
        displayedBoundaryLayerIds={displayedBoundaryLayerIds}
        viewKey={viewKey}
      />
    </ThemeProvider>,
  );
}

const overlayText = () => screen.queryByText('Loading boundaries…');

describe('BoundaryLoadingOverlay', () => {
  afterEach(() => {
    mockMaplibreMap.mockReset();
  });

  test('hides only once boundary sources have finished loading on map idle', () => {
    const map = createFakeMap({ sourcesLoaded: false });
    mockMaplibreMap.mockReturnValue(map);

    renderOverlay('KEN');
    expect(overlayText()).toBeInTheDocument();

    // Idle with cached low-zoom tiles still resolving (sources not loaded yet):
    // overlay must stay visible through the transition.
    act(() => map.fireIdle());
    expect(overlayText()).toBeInTheDocument();

    // High-res boundaries finished loading, then the map settles.
    map.sourcesLoaded = true;
    act(() => map.fireIdle());
    expect(overlayText()).not.toBeInTheDocument();
  });

  test('re-shows on a new view and not on later idles within the same view', () => {
    const map = createFakeMap({ sourcesLoaded: true });
    mockMaplibreMap.mockReturnValue(map);

    const { rerender } = renderOverlay('landing');
    act(() => map.fireIdle());
    expect(overlayText()).not.toBeInTheDocument();

    // Later pan/zoom within the same view should not re-show the overlay.
    act(() => map.fireIdle());
    expect(overlayText()).not.toBeInTheDocument();

    // Selecting a country (new view) shows it again until that view settles.
    rerender(
      <ThemeProvider theme={theme}>
        <BoundaryLoadingOverlay
          displayedBoundaryLayerIds={[
            'universal_admin0_boundaries',
            'universal_admin1_boundaries',
          ]}
          viewKey="KEN"
        />
      </ThemeProvider>,
    );
    expect(overlayText()).toBeInTheDocument();

    act(() => map.fireIdle());
    expect(overlayText()).not.toBeInTheDocument();
  });
});
