import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';

import GroupItem from '.';
import { store } from '../../../../context/store';
import { MenuGroup, MenuGroupItem } from '../../../../config/types';

const props = {
  menuGroup: {
    title: 'title',
    layers: [{ id: 'id', label: 'label' }] as MenuGroupItem[],
  } as MenuGroup,
  toggleLayerValue: () => {},
};

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <GroupItem {...props} />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
