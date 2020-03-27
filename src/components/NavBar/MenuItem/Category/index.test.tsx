import React from 'react';
import { render } from '@testing-library/react';
import Category from '.';

const props = {
  title: 'Category 1',
  layers: [
    {
      id: 'ID',
      title: 'layer',
      serverType: 'wms',
      hasDate: false,
      opacity: 0.5,
      legendText: 'legendText',
    },
  ],
};

test('renders as expected', () => {
  const { container } = render(<Category {...props} />);
  expect(container).toMatchSnapshot();
});
