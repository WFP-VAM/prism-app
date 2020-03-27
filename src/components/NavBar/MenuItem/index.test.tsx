import React from 'react';
import { render } from '@testing-library/react';
import MenuItem from '.';

jest.mock('./Category', () => 'mock-Category');

const props = {
  title: 'title',
  icon: 'icon.png',
  layersList: [
    {
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
    },
  ],
};

test('renders as expected', () => {
  const { container } = render(<MenuItem {...props} />);
  expect(container).toMatchSnapshot();
});
