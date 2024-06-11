import React from 'react';
import { render } from '@testing-library/react';
import { DateItem } from 'config/types';
import TimelineItem, { TimelineItemProps } from '.';

test('TimelineItem renders as expected', () => {
  // Arrange
  const currentDateTime = new Date().getTime();
  const concatenatedLayers = [
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
  ];

  const props: Omit<TimelineItemProps, 'classes'> = {
    clickDate: () => {},
    concatenatedLayers,
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
      { class: 'intersectionDate', color: 'White' },
      { class: 'intersectionDate', color: 'White' },
    ],
  };

  // Act
  const { container } = render(<TimelineItem {...props} />);

  // Assert
  expect(container).toMatchSnapshot();
});

test('TimelineItem renders as expected with data point starting after Timeline start date', () => {
  // Arrange
  const currentDateTime = 1640991600000; // 01-01-2022
  const firstLayerDataPoint = 1669896000000; // 01-12-2022
  const secondLayerDataPoint = 1670756400000; // 12-12-2022

  const layerDates: DateItem[] = [
    {
      displayDate: firstLayerDataPoint,
      queryDate: firstLayerDataPoint,
    },
    {
      displayDate: secondLayerDataPoint,
      queryDate: secondLayerDataPoint,
    },
  ];

  const concatenatedLayers = [layerDates, layerDates];

  const props: Omit<TimelineItemProps, 'classes'> = {
    clickDate: () => {},
    concatenatedLayers,
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
      { class: 'intersectionDate', color: 'White' },
      { class: 'intersectionDate', color: 'White' },
    ],
  };

  // Act
  const { container } = render(<TimelineItem {...props} />);

  // Assert
  expect(container).toMatchSnapshot();
});
