import { render } from '@testing-library/react';
import LegendImpactResult from './index';

test('renders as expected', () => {
  const { container } = render(
    <LegendImpactResult legendText="Some test legend text" />,
  );
  expect(container).toMatchSnapshot();
});
