import React from 'react';
import { render } from '@testing-library/react';
import AnalyserButton from '.';

test('render AnalyserButton as expected', () => {
  const { container } = render(
    <AnalyserButton
      onClick={() => jest.fn()}
      disabled={false}
      label="Run Analysis"
    />,
  );
  expect(container).toMatchSnapshot();
});
