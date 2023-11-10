import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import NotFound from '.';

test('renders as expected', () => {
  const { container } = render(
    <BrowserRouter>
      <NotFound />
    </BrowserRouter>,
  );
  expect(container).toMatchSnapshot();
});
