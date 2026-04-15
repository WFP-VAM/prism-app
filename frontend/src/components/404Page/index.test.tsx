import { render } from '@testing-library/react';
import { TestBrowserRouter } from 'test/TestBrowserRouter';
import NotFound from '.';

test('renders as expected', () => {
  const { container } = render(
    <TestBrowserRouter>
      <NotFound />
    </TestBrowserRouter>,
  );
  expect(container).toMatchSnapshot();
});
