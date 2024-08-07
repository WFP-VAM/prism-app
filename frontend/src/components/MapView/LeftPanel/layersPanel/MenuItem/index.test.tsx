import { Provider } from 'react-redux';
import { render } from '@testing-library/react';

import { store } from 'context/store';
import { LayerKey, MenuItemType } from 'config/types';
import MenuItem from '.';

jest.mock(
  'components/MapView/LeftPanel/layersPanel/MenuItem/MenuSwitch',
  () => 'mock-MenuSwitch',
);

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
