import { render } from '@testing-library/react';

import ColorIndicator from '.';

const props = {
  value: 'Vegetation',
  color: '#EF3202',
  opacity: 0.7,
};

test('renders as expected', () => {
  const { container } = render(<ColorIndicator {...props} />);
  expect(container).toMatchSnapshot();
});
