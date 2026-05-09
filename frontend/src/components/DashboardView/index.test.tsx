import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createTheme, ThemeProvider } from '@material-ui/core';
import { downloadToFile } from 'components/MapView/utils';
import { setDraftDashboard } from 'context/dashboardStateSlice';
import { store } from 'context/store';
import { TestBrowserRouter } from 'test/TestBrowserRouter';
import DashboardView from '.';

jest.mock('components/MapView/utils', () => ({
  downloadToFile: jest.fn(),
}));

jest.mock('./DashboardContent', () => () => null);
jest.mock('./DashboardExport', () => ({ DashboardExportDialog: () => null }));

jest.mock('hooks/usePersistDraftDashboards', () => ({
  usePersistDraftDashboards: jest.fn(),
}));

jest.mock('i18n', () => ({
  useSafeTranslation: () => ({ t: (k: string) => k }),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ path: 'test-dashboard' }),
  useHistory: () => ({ replace: jest.fn() }),
  useLocation: () => ({ pathname: 'localhost:3000/' }),
}));

const FIXED_TIMESTAMP = 1700000000000;

const mockDashboard = {
  title: 'Test Dashboard',
  path: 'test-dashboard',
  isEditable: true,
  isDraft: true,
  firstColumn: [],
};

function renderDashboardView() {
  return render(
    <TestBrowserRouter>
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <DashboardView />
        </ThemeProvider>
      </Provider>
    </TestBrowserRouter>,
  );
}

describe('DashboardView export JSON', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_TIMESTAMP);
  });

  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    jest.clearAllMocks();
    store.dispatch(setDraftDashboard(mockDashboard));
  });

  it('calls downloadToFile with a JSON array, application/json content type, and slug_timestamp filename', () => {
    renderDashboardView();
    fireEvent.click(screen.getByText('Export JSON'));

    expect(downloadToFile).toHaveBeenCalledTimes(1);

    const [source, filename, contentType] =
      jest.mocked(downloadToFile).mock.calls[0];

    expect(contentType).toBe('application/json');
    expect(filename).toBe(`test-dashboard_${FIXED_TIMESTAMP}`);
    expect(source.isUrl).toBe(false);

    const parsed = JSON.parse(source.content);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe('Test Dashboard');
    expect(parsed[0].path).toBe('test-dashboard');
  });

  it('strips isDraft, selectedDashboardIndex, and maps from the exported payload', () => {
    renderDashboardView();
    fireEvent.click(screen.getByText('Export JSON'));

    const [source] = jest.mocked(downloadToFile).mock.calls[0];
    const parsed = JSON.parse(source.content);

    expect(parsed[0]).not.toHaveProperty('isDraft');
    expect(parsed[0]).not.toHaveProperty('selectedDashboardIndex');
    expect(parsed[0]).not.toHaveProperty('maps');
  });
});
