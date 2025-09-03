import { Typography, Box } from '@material-ui/core';
import { useSafeTranslation } from 'i18n';
import { DateRangeType } from 'config/types';
import { useSelector } from 'react-redux';
import { RootState } from 'context/store';

interface AAFloodTooltipContentProps {
  date: DateRangeType;
}

function AAFloodTooltipContent({ date }: AAFloodTooltipContentProps) {
  const { t } = useSafeTranslation();
  const { availableDates } = useSelector(
    (state: RootState) => state.anticipatoryActionFloodState,
  );

  // Find the date info for the selected date
  const dateInfo = availableDates.find(
    d => Math.abs(d.displayDate - date.value) < 24 * 60 * 60 * 1000, // Within 24 hours
  );

  const dateString = new Date(date.value).toLocaleDateString();
  const severityColor = dateInfo?.color || '#4CAF50';

  return (
    <Box>
      <Typography variant="body2" style={{ fontWeight: 'bold' }}>
        {t('Flood Status - {{date}}', { date: dateString })}
      </Typography>
      <Box
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '4px',
        }}
      >
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: severityColor,
          }}
        />
        <Typography variant="body2">
          {t('Highest severity level for this date')}
        </Typography>
      </Box>
    </Box>
  );
}

export default AAFloodTooltipContent;
