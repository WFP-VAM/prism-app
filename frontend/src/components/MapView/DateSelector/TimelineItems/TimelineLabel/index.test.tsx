import { render } from '@testing-library/react';
import TimelineLabel, { TimelineLabelProps } from '.';

test('TimelineLabel renders as expected', () => {
  // Arrange
  const props: Omit<TimelineLabelProps, 'classes'> = {
    locale: 'fr',
    date: {
      value: 1640883600000,
      label: '31 Dec 2021',
      month: 'Dec 2021',
      isFirstDay: true,
      date: '2021-12-31',
    },
  };

  // Act
  const { container } = render(<TimelineLabel {...props} />);

  // Assert
  expect(container).toMatchSnapshot();
});
