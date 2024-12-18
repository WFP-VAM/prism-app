import { render } from '@testing-library/react';
import { DateItem } from 'config/types';
import AADroughtTimelineItem, { AADroughtTimelineItemProps } from '.';

test('AADroughtTimelineItem renders as expected', () => {
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
      },
    ],
  ];

  const props: Omit<AADroughtTimelineItemProps, 'classes'> = {
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
  const { container } = render(<AADroughtTimelineItem {...props} />);

  // Assert
  expect(container).toMatchSnapshot();
});

test('AADroughtTimelineItem renders as expected with data point starting after Timeline start date', () => {
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

  const props: Omit<AADroughtTimelineItemProps, 'classes'> = {
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
  const { container } = render(<AADroughtTimelineItem {...props} />);

  // Assert
  expect(container).toMatchSnapshot();
});
