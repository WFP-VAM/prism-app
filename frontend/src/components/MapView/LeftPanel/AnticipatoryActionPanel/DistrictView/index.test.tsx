import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import { AnticipatoryActionState } from 'context/anticipatoryActionStateSlice/types';
import DistrictView from '.';
import { defaultDialogs, mockAAData } from '../test.utils';
import { districtViewTransform } from './utils';

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
        <DistrictView dialogs={defaultDialogs} />
      </Provider>
    </BrowserRouter>,
  );
  expect(container).toMatchSnapshot();
});

test('District view transformation', () => {
  const res = districtViewTransform(mockAAData['Window 1'].Changara, filters);

  expect(res).toEqual(out);
});

const out = {
  months: {
    '2023-09-01': 'Sep',
    '2023-10-01': 'Oct',
    '2023-11-01': 'Nov',
  },
  transformed: {
    '20': [
      {
        category: 'Mild',
        district: 'Changara',
        index: 'SPI DJF',
        type: 'SPI',
        window: 'Window 1',
        new: false,
        phase: 'Ready',
        probability: 0.31,
        trigger: 0.2,
        date: '2023-10-01',
        isValid: true,
      },
      {
        category: 'Mild',
        district: 'Changara',
        index: 'SPI DJF',
        type: 'SPI',
        window: 'Window 1',
        new: true,
        phase: 'Set',
        probability: 0.28,
        trigger: 0.25,
        date: '2023-11-01',
        isValid: true,
        wasReadyValid: true,
      },
    ],
    '30': [
      {
        category: 'Moderate',
        district: 'Changara',
        index: 'SPI DJF',
        type: 'SPI',
        window: 'Window 1',
        new: true,
        phase: 'Ready',
        probability: 0.19,
        trigger: 0.1,
        date: '2023-09-01',
        isValid: true,
      },
      {
        category: 'Moderate',
        district: 'Changara',
        index: 'SPI DJF',
        type: 'SPI',
        window: 'Window 1',
        new: false,
        phase: 'Ready',
        probability: 0.28,
        trigger: 0.2,
        date: '2023-10-01',
        isValid: true,
      },
      {
        category: 'Moderate',
        district: 'Changara',
        index: 'SPI DJF',
        type: 'SPI',
        window: 'Window 1',
        new: false,
        phase: 'na',
        probability: 0.25,
        trigger: 0.26,
        date: '2023-10-01',
        isValid: false,
        wasReadyValid: true,
      },
      {
        category: 'Moderate',
        district: 'Changara',
        index: 'SPI DJF',
        type: 'SPI',
        window: 'Window 1',
        new: false,
        phase: 'na',
        probability: 0.22,
        trigger: 0.3,
        date: '2023-11-01',
        isValid: false,
        wasReadyValid: true,
      },
    ],
  },
};
