import { render } from '@testing-library/react';
import AALegend from '.';

test('renders as expected', () => {
  const { container } = render(<AALegend />);
  expect(container).toMatchSnapshot();
});
