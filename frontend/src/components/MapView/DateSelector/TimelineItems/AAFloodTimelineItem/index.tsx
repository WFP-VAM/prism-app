import { useSelector } from 'react-redux';
import { RootState } from 'context/store';
import { DateRangeType } from 'config/types';
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

  return (
    <div
      style={{
        position: 'absolute',
        height: 24,
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
