import { DateRangeType } from 'config/types';
import { compact } from 'lodash';
import React, { FC } from 'react';
import { datesAreEqualWithoutTime, getFormattedDate } from 'utils/date-utils';
import { useSafeTranslation } from 'i18n';
import TooltipItem from '../TooltipItem';
import { DateCompatibleLayerWithDateItems } from '../../utils';
import { DateItemStyle } from '../types';

const StandardTooltipContent: FC<StandardTooltipContentProps> = ({
  date,
  orderedLayers,
  dateItemStyling,
}) => {
  const { t } = useSafeTranslation();

  const tooltipTitleArray: React.JSX.Element[] = compact(
    orderedLayers.map((selectedLayer, layerIndex) => {
      // find closest date element for layer
      const dateItem = selectedLayer.dateItems.find(item =>
        datesAreEqualWithoutTime(item.displayDate, date.value),
      );

      if (!dateItem) {
        return null;
      }

      // Display range dates when available
      const formattedDate =
        dateItem.startDate && dateItem.endDate
          ? `${getFormattedDate(
              dateItem.startDate,
              'monthDay',
            )} - ${getFormattedDate(dateItem.endDate, 'monthDay')}`
          : getFormattedDate(dateItem.queryDate, 'monthDay');
      return (
        <TooltipItem
          key={`Tootlip-${date.label}-${date.value}-${selectedLayer.title}`}
          layerTitle={`${t(selectedLayer.title)}:  ${formattedDate}`}
          color={dateItemStyling[layerIndex].color}
        />
      );
    }),
  );

  tooltipTitleArray.unshift(<div key={date.label}>{date.label}</div>);
  return tooltipTitleArray;
};

interface StandardTooltipContentProps {
  date: DateRangeType;
  orderedLayers: DateCompatibleLayerWithDateItems[];
  dateItemStyling: DateItemStyle[];
}

export default StandardTooltipContent;
