import { DateRangeType } from 'config/types';
import { RootState } from 'context/store';
import { useSelector } from 'react-redux';
import { datesAreEqualWithoutTime } from 'utils/date-utils';

import { TIMELINE_ITEM_WIDTH } from '../../utils';

interface AAFloodTimelineItemProps {
  currentDate: DateRangeType;
}

function AAFloodTimelineItem({ currentDate }: AAFloodTimelineItemProps) {
  const { availableDates } = useSelector(
    (state: RootState) => state.anticipatoryActionFloodState,
  );

  // Find the date info for this date
  const dateInfo = availableDates.find(d =>
    datesAreEqualWithoutTime(d.displayDate, currentDate.value),
  );

  if (!dateInfo) {
    return null;
  }
  const severityColor = dateInfo?.color || '#4CAF50';
  // Taller mark = higher severity, same idea as the storm ticks, so the
  // date bar is readable without relying on color alone.
  const barHeight =
    dateInfo?.severity === 'Severe'
      ? 24
      : dateInfo?.severity === 'Moderate'
        ? 20
        : dateInfo?.severity === 'Bankfull'
          ? 16
          : 12;

  return (
    <div
      style={{
        position: 'absolute',
        height: barHeight,
        width: TIMELINE_ITEM_WIDTH - 1,
        pointerEvents: 'none',
        top: 0,
        backgroundColor: severityColor,
        borderRadius: '2px',
        transition: 'opacity 0.2s ease',
      }}
    />
  );
}

export default AAFloodTimelineItem;
