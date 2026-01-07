import React from 'react';
import { render } from '@testing-library/react';
import { DateItem } from 'config/types';
import StandardTimelineItem, { StandardTimelineItemProps } from '.';

test('StandardTimelineItem renders as expected', () => {
  // Arrange
  const currentDateTime = new Date().getTime();
  const concatenatedLayers = [
    [
      {
        displayDate: currentDateTime,
        queryDate: currentDateTime,
      },
    ],
    [
      {
        displayDate: currentDateTime,
        queryDate: currentDateTime,
      },
      {
        displayDate: currentDateTime,
        queryDate: currentDateTime,
      },
    ],
  ] as DateItem[][];

  const props: Omit<StandardTimelineItemProps, 'classes'> = {
    isDateAvailable: false,
    concatenatedLayers,
    currentDate: {
      value: currentDateTime,
      label: '',
      month: '',
      isFirstDay: false,
      date: '',
    },
    dateItemStyling: [
      {
        validityClass: 'intersectionDate',
        color: 'White',
        coverageClass: 'intersectionDate',
      },
      {
        validityClass: 'layerOneDate',
        color: '',
        coverageClass: 'layerOneDate',
      },
      {
        validityClass: 'intersectionDate',
        color: 'White',
        coverageClass: 'intersectionDate',
      },
      {
        validityClass: 'intersectionDate',
        color: 'White',
        coverageClass: 'intersectionDate',
      },
    ],
  };

  // Act
  const { container } = render(<StandardTimelineItem {...props} />);

  // Assert
  expect(container).toMatchSnapshot();
});

test('StandardTimelineItem renders as expected with data point starting after Timeline start date', () => {
  // Arrange
  const currentDateTime = 1640991600000; // 01-01-2022
  const firstLayerDataPoint = 1669896000000; // 01-12-2022
  const secondLayerDataPoint = 1670756400000; // 12-12-2022

  const layerDates = [
    {
      displayDate: firstLayerDataPoint,
      queryDate: firstLayerDataPoint,
    },
    {
      displayDate: secondLayerDataPoint,
      queryDate: secondLayerDataPoint,
    },
  ] as DateItem[];

  const concatenatedLayers = [layerDates, layerDates];

  const props: Omit<StandardTimelineItemProps, 'classes'> = {
    isDateAvailable: false,
    concatenatedLayers,
    currentDate: {
      value: currentDateTime,
      label: '',
      month: '',
      isFirstDay: false,
      date: '',
    },
    dateItemStyling: [
      {
        validityClass: 'intersectionDate',
        color: 'White',
        coverageClass: 'intersectionDate',
      },
      {
        validityClass: 'layerOneDate',
        color: '',
        coverageClass: 'layerOneDate',
      },
      {
        validityClass: 'intersectionDate',
        color: 'White',
        coverageClass: 'intersectionDate',
      },
      {
        validityClass: 'intersectionDate',
        color: 'White',
        coverageClass: 'intersectionDate',
      },
    ],
  };

  // Act
  const { container } = render(<StandardTimelineItem {...props} />);

  // Assert
  expect(container).toMatchSnapshot();
});
