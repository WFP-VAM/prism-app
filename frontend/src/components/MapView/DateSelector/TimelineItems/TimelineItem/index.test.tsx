import React from 'react';
import { render } from '@testing-library/react';
import TimelineItem, { TimelineItemProps } from '.';

test('TimelineItem renders as expected', () => {
  // Arrange
  const currentDateTime = new Date().getTime();
  const props: Omit<TimelineItemProps, 'classes'> = {
    clickDate: () => {},
    concatenatedLayers: [
      [{ displayDate: currentDateTime, queryDate: currentDateTime }],
      [
        {
          displayDate: currentDateTime,
          queryDate: currentDateTime,
        },
        {
          displayDate: currentDateTime,
          queryDate: currentDateTime,
          isStartDate: true,
        },
      ],
    ],
    currentDate: {
      value: currentDateTime,
      label: '',
      month: '',
      isFirstDay: false,
      date: '',
    },
    index: 1,
    dateItemStyling: [
      { class: 'intersectionDate', color: 'White' },
      {
        class: 'layerOneDate',
        color: '',
        layerDirectionClass: 'layerDirectionClass',
      },
    ],
  };

  // Act
  const { container } = render(<TimelineItem {...props} />);

  // Assert
  expect(container).toMatchSnapshot();
});
