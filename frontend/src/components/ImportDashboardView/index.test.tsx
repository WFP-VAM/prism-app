import '@testing-library/jest-dom';

import {
  StyledEngineProvider,
  Theme,
  ThemeProvider,
} from '@mui/material/styles';
import {
  StylesProvider,
  ThemeProvider as StylesThemeProvider,
} from '@mui/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { DashboardElementType } from 'config/types';
import {
  dashboardsListSelector,
  setDashboards,
} from 'context/dashboardStateSlice';
import { store } from 'context/store';
import { validateImportedDashboardConfig } from 'dashboardConfig/schema';
import muiTheme from 'muiTheme';
import { Provider } from 'react-redux';
import { TestBrowserRouter } from 'test/TestBrowserRouter';

import ImportDashboardView from '.';

declare module '@mui/styles/defaultTheme' {
  interface DefaultTheme extends Theme {}
}

const minimalValidDashboard = {
  title: 'Imported Dashboard',
  firstColumn: [
    {
      type: DashboardElementType.TEXT,
      content: 'Hello',
    },
  ],
};

const validatedImport = validateImportedDashboardConfig(minimalValidDashboard);
if (!validatedImport.success) {
  throw new Error('minimalValidDashboard must be valid for tests');
}
const existingDashboard = {
  ...validatedImport.data,
  isDraft: true,
};

let fileReaderText = '';

class MockFileReader {
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null;

  readAsText() {
    this.onload?.({
      target: { result: fileReaderText },
    } as ProgressEvent<FileReader>);
  }
}

function renderImportView() {
  return render(
    <TestBrowserRouter>
      <Provider store={store}>
        <StyledEngineProvider injectFirst>
          <ThemeProvider theme={muiTheme}>
            <StylesThemeProvider theme={muiTheme}>
              <StylesProvider injectFirst>
                <ImportDashboardView />
              </StylesProvider>
            </StylesThemeProvider>
          </ThemeProvider>
        </StyledEngineProvider>
      </Provider>
    </TestBrowserRouter>,
  );
}

function uploadJsonFile(container: HTMLElement) {
  const input = container.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  const file = new File([fileReaderText], 'dashboard.json', {
    type: 'application/json',
  });
  fireEvent.change(input, { target: { files: [file] } });
}

describe('ImportDashboardView', () => {
  beforeAll(() => {
    jest
      .spyOn(global, 'FileReader')
      .mockImplementation(() => new MockFileReader() as unknown as FileReader);
  });

  beforeEach(() => {
    jest.useFakeTimers();
    fileReaderText = '';
    store.dispatch(setDashboards([]));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('renders idle state', () => {
    const { container } = renderImportView();
    expect(container).toMatchSnapshot();
  });

  test('shows success after a valid dashboard file is imported', () => {
    fileReaderText = JSON.stringify(minimalValidDashboard);
    const { container } = renderImportView();

    uploadJsonFile(container);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByText('Import complete')).toBeInTheDocument();
    expect(screen.getByText('Imported Dashboard')).toBeInTheDocument();
    expect(screen.getByText('View dashboard')).toBeInTheDocument();
    expect(dashboardsListSelector(store.getState())).toHaveLength(1);
    expect(container).toMatchSnapshot();
  });

  test('shows already-exists when imported dashboard matches one in store', () => {
    store.dispatch(setDashboards([existingDashboard]));
    fileReaderText = JSON.stringify(minimalValidDashboard);
    const { container } = renderImportView();

    uploadJsonFile(container);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByText('Dashboard already exists')).toBeInTheDocument();
    expect(screen.getByText('Imported Dashboard')).toBeInTheDocument();
    expect(screen.getByText('View dashboard')).toBeInTheDocument();
    expect(dashboardsListSelector(store.getState())).toHaveLength(1);
    expect(container).toMatchSnapshot();
  });

  test('detects duplicate when imported JSON has different key ordering', () => {
    store.dispatch(setDashboards([existingDashboard]));
    // Same content as minimalValidDashboard but with keys in a different order
    const reorderedDashboard = {
      firstColumn: [
        {
          content: 'Hello',
          type: DashboardElementType.TEXT,
        },
      ],
      title: 'Imported Dashboard',
    };
    fileReaderText = JSON.stringify(reorderedDashboard);
    const { container } = renderImportView();

    uploadJsonFile(container);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByText('Dashboard already exists')).toBeInTheDocument();
    expect(dashboardsListSelector(store.getState())).toHaveLength(1);
    expect(container).toMatchSnapshot();
  });

  test('shows parse error for invalid JSON', () => {
    fileReaderText = '{ not valid json';
    const { container } = renderImportView();

    uploadJsonFile(container);

    expect(screen.getByText('Invalid dashboard file')).toBeInTheDocument();
    expect(
      screen.getByText('Could not parse file as JSON.'),
    ).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  test('shows validation error when JSON fails schema checks', () => {
    fileReaderText = JSON.stringify({
      title: 'Bad dashboard',
      firstColumn: [{ type: 'BOGUS' }],
    });
    const { container } = renderImportView();

    uploadJsonFile(container);

    expect(screen.getByText('Invalid dashboard file')).toBeInTheDocument();
    expect(
      screen.getByText(/Invalid dashboard configuration/i),
    ).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });
});
