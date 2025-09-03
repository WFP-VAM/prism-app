import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'context/store';
import { useSafeTranslation } from 'i18n';
import { Popup } from 'react-map-gl/maplibre';
import { Typography, Box, makeStyles, createStyles } from '@material-ui/core';
import { FloodDateItem } from 'context/anticipatoryAction/AAFloodStateSlice/types';

const useStyles = makeStyles(() =>
  createStyles({
    popup: {
      '& .mapboxgl-popup-content': {
        padding: '8px 12px',
        borderRadius: '4px',
      },
    },
    dateInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    severityIndicator: {
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      display: 'inline-block',
    },
  }),
);

interface AAFloodDatePopupProps {
  availableDates: FloodDateItem[];
}

function AAFloodDatePopup({ availableDates }: AAFloodDatePopupProps) {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const { startDate } = useSelector(
    (state: RootState) => state.mapState.dateRange,
  );

  const currentDateInfo = useMemo(() => {
    if (!startDate || !availableDates.length) {
      return null;
    }

    // Find the closest date to the selected date
    const closestDate = availableDates.reduce((closest, current) => {
      const currentDiff = Math.abs(current.displayDate - startDate);
      const closestDiff = Math.abs(closest.displayDate - startDate);
      return currentDiff < closestDiff ? current : closest;
    });

    return closestDate;
  }, [startDate, availableDates]);

  if (!currentDateInfo) {
    return null;
  }

  const dateString = new Date(currentDateInfo.displayDate).toLocaleDateString();

  return (
    <Popup
      longitude={0}
      latitude={0}
      closeButton={false}
      closeOnClick={false}
      className={classes.popup}
    >
      <Box className={classes.dateInfo}>
        <div
          className={classes.severityIndicator}
          style={{ backgroundColor: currentDateInfo.color || '#4CAF50' }}
        />
        <Typography variant="body2">
          {t('Flood Status - {{date}}', { date: dateString })}
        </Typography>
      </Box>
    </Popup>
  );
}

export default AAFloodDatePopup;
