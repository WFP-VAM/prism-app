import { Typography, Box } from '@material-ui/core';
import { DateRangeType } from 'config/types';
import { useSelector } from 'react-redux';
import { RootState } from 'context/store';
import { formatInUTC } from 'components/MapView/Layers/AnticipatoryActionStormLayer/utils';
import { datesAreEqualWithoutTime } from 'utils/date-utils';

interface AAFloodTooltipContentProps {
  date: DateRangeType;
}

function AAFloodTooltipContent({ date }: AAFloodTooltipContentProps) {
  const { availableDates } = useSelector(
    (state: RootState) => state.anticipatoryActionFloodState,
  );

  // Find the date info for the selected date
  const dateInfo = availableDates.find(d =>
    datesAreEqualWithoutTime(d.displayDate, date.value),
  );

  if (!dateInfo) {
    return (
      <Typography>{formatInUTC(new Date(date.value), 'MM/dd/yy')}</Typography>
    );
  }

  const dateString = formatInUTC(new Date(date.value), 'MM/dd/yy');
  const severityColor = dateInfo?.color || '#4CAF50';

  return (
    <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Typography>{dateString}</Typography>
      <div
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: severityColor,
        }}
      />
    </Box>
  );
}

export default AAFloodTooltipContent;
