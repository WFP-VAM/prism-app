import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import { AnticipatoryActionState } from 'context/anticipatoryActionStateSlice/types';
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
  anticipatoryActionState: {
    filters,
    selectedDistrict: 'Changara',
    monitoredDistricts: ['Changara'],
    data: mockAAData,
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
      'SPI DJF': 34,
    },
    Moderate: {
      'SPI DJF': 28,
    },
  },
  indexes: ['SPI DJF'],
};