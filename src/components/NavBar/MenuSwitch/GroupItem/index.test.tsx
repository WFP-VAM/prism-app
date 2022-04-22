import React from 'react';
import { render } from '@testing-library/react';
import { MenuGroupItem } from '../../../../config/types';

import GroupItem from '.';

const props = {
  menuGroup: [{ id: 'id', label: 'label' }] as MenuGroupItem[],
  toggleLayerValue: () => {},
};

test('renders as expected', () => {
  const { container } = render(<GroupItem {...props} />);
  expect(container).toMatchSnapshot();
});
