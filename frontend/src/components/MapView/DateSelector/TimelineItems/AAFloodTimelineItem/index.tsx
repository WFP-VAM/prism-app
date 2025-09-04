import { useSelector } from 'react-redux';
import { useState } from 'react';
import { RootState } from 'context/store';
import { DateRangeType } from 'config/types';
import { TIMELINE_ITEM_WIDTH } from '../../utils';

interface AAFloodTimelineItemProps {
  currentDate: DateRangeType;
}

function AAFloodTimelineItem({ currentDate }: AAFloodTimelineItemProps) {
  const { availableDates } = useSelector(
    (state: RootState) => state.anticipatoryActionFloodState,
  );
  const [isHovered, setIsHovered] = useState(false);

  // Find the date info for this date
  const dateInfo = availableDates.find(
    d => Math.abs(d.displayDate - currentDate.value) < 24 * 60 * 60 * 1000, // Within 24 hours
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
        opacity: isHovered ? 0.8 : 1,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    />
  );
}

export default AAFloodTimelineItem;
