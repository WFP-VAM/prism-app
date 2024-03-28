import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import HomeTable from '.';
import { mockAARenderedDistricts } from '../test.utils';

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
    filters: {
      selectedWindow: 'Window 1',
      categories: {
        Severe: true,
        Moderate: true,
        Mild: true,
      },
    },
    monitoredDistricts: ['Caia'],
    renderedDistricts: mockAARenderedDistricts,
  },
});

test('renders as expected', () => {
  const { container } = render(
    <BrowserRouter>
      <Provider store={store}>
        <HomeTable setSelectedDistrict={() => {}} />
      </Provider>
    </BrowserRouter>,
  );
  expect(container).toMatchSnapshot();
});
