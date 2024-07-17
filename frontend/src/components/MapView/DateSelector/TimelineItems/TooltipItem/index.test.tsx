import { render } from '@testing-library/react';
import TooltipItem from '.';

test('renders as expected', () => {
  const { container } = render(
    <TooltipItem layerTitle="Some Title" color="Some Color" />,
  );
  expect(container).toMatchSnapshot();
});
