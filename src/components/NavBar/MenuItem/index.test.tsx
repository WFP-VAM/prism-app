import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';

import MenuItem from '.';
import { store } from '../../../context/store';
import { LayerKey, MenuItemType } from '../../../config/types';

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    replace: jest.fn(),
    location: {
      search: '',
    },
  }),
}));
const props: MenuItemType = {
  title: 'title',
  icon: 'icon.png',
  layersCategories: [
    {
      title: 'Category 1',
      layers: [
        {
          id: 'ID' as LayerKey,
          title: 'layer',
          type: 'wms',
          baseUrl: 'example.com',
          serverLayerName: 'example',
          legend: [],
          opacity: 0.5,
          legendText: 'legendText',
        },
      ],
      tables: [],
    },
  ],
};

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <MenuItem {...props} />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
