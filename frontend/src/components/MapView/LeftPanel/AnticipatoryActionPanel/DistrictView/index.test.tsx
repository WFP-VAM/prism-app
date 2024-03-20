import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import DistrictView from '.';
import { mockAAData } from '../test.utils';

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
    selectedWindow: 'Window 2',
    categoryFilters: {
      Severo: true,
      Moderado: true,
      Leve: true,
    },
    monitoredDistricts: ['Caia'],
    data: mockAAData,
  },
});

test('renders as expected', () => {
  const { container } = render(
    <BrowserRouter>
      <Provider store={store}>
        <DistrictView selectedDistrict="Caia" />
      </Provider>
    </BrowserRouter>,
  );
  expect(container).toMatchSnapshot();
});
