import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import HomeTable from '.';

const mockStore = configureStore([]);

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
    selectedWindow: 'Window 1',
    categoryFilters: {
      Severe: true,
      Moderate: true,
      Mild: true,
    },
    monitoredDistricts: ['Caia'],
    data: {
      'Window 2': {
        Caia: [
          {
            category: 'Severe',
            district: 'Caia',
            index: 'SPI MA',
            month: '12',
            phase: 'Set',
            probability: '0.41',
            trigger: '0',
            triggerNB: 'trigger2',
            triggerType: 'Acionadores de Crise',
            type: 'SPI',
            windows: 'Window 2',
            yearOfIssue: '2023-24',
            date: '2023-12-01',
          },
          {
            category: 'Moderate',
            district: 'Caia',
            index: 'SPI MA',
            month: '12',
            phase: 'Set',
            probability: '0.49',
            trigger: '0',
            triggerNB: 'trigger2',
            triggerType: 'Acionadores de Crise',
            type: 'SPI',
            windows: 'Window 2',
            yearOfIssue: '2023-24',
            date: '2023-12-01',
          },
          {
            category: 'Mild',
            district: 'Caia',
            index: 'SPI MAM',
            month: '12',
            phase: 'Set',
            probability: '0.5',
            trigger: '0',
            triggerNB: 'trigger2',
            triggerType: 'Acionadores de Crise',
            type: 'SPI',
            windows: 'Window 2',
            yearOfIssue: '2023-24',
            date: '2023-12-01',
          },
          {
            category: 'Severe',
            district: 'Caia',
            index: 'SPI MA',
            month: '11',
            phase: 'Ready',
            probability: '0.12',
            trigger: '0.24',
            triggerNB: 'trigger1',
            triggerType: 'Acionadores de Crise',
            type: 'SPI',
            windows: 'Window 2',
            yearOfIssue: '2023-24',
            date: '2023-11-01',
          },
          {
            category: 'Severe',
            district: 'Caia',
            index: 'SPI MA',
            month: '11',
            phase: 'Set',
            probability: '0.12',
            trigger: '0.24',
            triggerNB: 'trigger2',
            triggerType: 'Acionadores de Crise',
            type: 'SPI',
            windows: 'Window 2',
            yearOfIssue: '2023-24',
            date: '2023-11-01',
          },
        ],
      },
    },
  },
});

test('renders as expected', () => {
  const { container } = render(
    <BrowserRouter>
      <Provider store={store}>
        <HomeTable />
      </Provider>
    </BrowserRouter>,
  );
  expect(container).toMatchSnapshot();
});
