import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import { AnticipatoryActionState } from 'context/anticipatoryAction/AADroughtStateSlice/types';
import { Panel } from 'config/types';
import { defaultDialogs, mockAAData } from '../test.utils';
import { forecastTransform } from './utils';
import Forecast from '.';

const mockStore = configureStore([]);

const filters: AnticipatoryActionState['filters'] = {
  selectedWindow: 'Window 1',
  categories: {
    Severe: true,
    Moderate: true,
    Mild: true,
    na: true,
    ny: true,
    Normal: true,
  },
  selectedIndex: '',
  selectedDate: undefined,
};

const store = mockStore({
  mapState: {
    layers: [],
    dateRange: { startDate: 1701432000000 },
    maplibreMap: () => {},
    errors: [],
    layersData: [],
    loadingLayerIds: [],
    boundaryRelationData: {},
  },
  serverState: { availableDates: {}, loading: false },
  anticipatoryActionDroughtState: {
    filters,
    selectedDistrict: 'Changara',
    monitoredDistricts: ['Changara'],
    data: mockAAData,
  },
  leftPanelState: {
    tabValue: Panel.AnticipatoryActionDrought,
  },
});

test('renders as expected', () => {
  const { container } = render(
    <BrowserRouter>
      <Provider store={store}>
        <Forecast dialogs={defaultDialogs} />
      </Provider>
    </BrowserRouter>,
  );
  expect(container).toMatchSnapshot();
});

test('District view transformation', () => {
  const res = forecastTransform({
    data: mockAAData,
    filters,
    selectedDistrict: 'Changara',
  });

  expect(res).toEqual(out);
});

const out = {
  chartData: {
    Mild: {
      'SPI DJF': {
        probability: 28,
        showWarningSign: true,
      },
    },
    Moderate: {
      'SPI DJF': {
        probability: 22,
        showWarningSign: false,
      },
    },
  },
  indexes: ['SPI DJF'],
};
