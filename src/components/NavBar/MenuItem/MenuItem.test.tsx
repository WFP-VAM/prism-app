import React from 'react';
import { render } from '@testing-library/react';
import MenuItem from './MenuItem';

jest.mock('./Category/Category', () => 'mock-Category');

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

test('examples of some things', () => {
  const { container } = render(<MenuItem {...props} />);
  expect(container).toMatchSnapshot();
});
