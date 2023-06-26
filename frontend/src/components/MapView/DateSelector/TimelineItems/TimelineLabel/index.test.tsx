import React from 'react';
import { render } from '@testing-library/react';
import TimelineItem, { TimelineLabelProps } from '.';

test('TimelineLabel renders as expected', () => {
  // Arrange
  const props: Omit<TimelineLabelProps, 'classes'> = {
    locale: 'fr',
    date: {
      value: new Date().getTime(),
      date: new Date().toISOString(),
      label: '',
      month: '',
      isFirstDay: true,
    },
  };

  // Act
  const { container } = render(<TimelineItem {...props} />);

  // Assert
  expect(container).toMatchSnapshot();
});
