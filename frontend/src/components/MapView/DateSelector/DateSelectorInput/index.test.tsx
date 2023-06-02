import { render } from '@testing-library/react';
import React from 'react';
import DateSelectorInput from '.';

test('renders as expected', () => {
  const { container } = render(
    <DateSelectorInput value="Some Value" onClick={() => {}} />,
  );
  expect(container).toMatchSnapshot();
});
