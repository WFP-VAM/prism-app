import React from 'react';
import { render } from '@testing-library/react';
import { LayerMenuGroupItem } from '../../../../config/types';

import MenuGroup from '.';

const props = {
  menuGroup: [{ id: 'id', label: 'label' }] as LayerMenuGroupItem[],
  toggleLayerValue: () => {},
};

test('renders as expected', () => {
  const { container } = render(<MenuGroup {...props} />);
  expect(container).toMatchSnapshot();
});
