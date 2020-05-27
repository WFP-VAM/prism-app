import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';

import MenuItem from '.';
import { store } from '../../../context/store';

const props = {
  title: 'title',
  icon: 'icon.png',
  layersCategories: [
    {
      title: 'Category 1',
      layers: [
        {
          id: 'ID',
          title: 'layer',
          type: 'wms',
          hasDate: false,
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
