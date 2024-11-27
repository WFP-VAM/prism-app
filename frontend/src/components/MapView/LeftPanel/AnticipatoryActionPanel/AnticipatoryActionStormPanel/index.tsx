import { Typography, createStyles, makeStyles } from '@material-ui/core';
import React from 'react';
import { useSafeTranslation } from 'i18n';
import { useDispatch, useSelector } from 'react-redux';
import {
  AAAvailableDatesSelector,
  setAAFilters,
} from 'context/anticipatoryActionStateSlice';
import { dateRangeSelector } from 'context/mapStateSlice/selectors';
import {
  getAAAvailableDatesCombined,
  getRequestDate,
} from 'utils/server-utils';
import { getFormattedDate } from 'utils/date-utils';
import { DateFormat } from 'utils/name-utils';
import { PanelSize } from 'config/types';
import HowToReadModal from '../HowToReadModal';

function AnticipatoryActionStormPanel() {
  const classes = useStyles();
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();
  const AAAvailableDates = useSelector(AAAvailableDatesSelector);

  const { startDate: selectedDate } = useSelector(dateRangeSelector);

  const [howToReadModalOpen, setHowToReadModalOpen] = React.useState(false);

  const layerAvailableDates =
    AAAvailableDates !== undefined
      ? getAAAvailableDatesCombined(AAAvailableDates)
      : [];

  const queryDate = getRequestDate(layerAvailableDates, selectedDate);
  const date = getFormattedDate(queryDate, DateFormat.Default) as string;

  React.useEffect(() => {
    dispatch(setAAFilters({ selectedDate: date }));
  }, [date, dispatch]);

  return (
    <div
      className={classes.anticipatoryActionPanel}
      style={{ width: PanelSize.medium }}
    >
      <HowToReadModal
        open={howToReadModalOpen}
        onClose={() => setHowToReadModalOpen(false)}
      />
      <div className={classes.headerWrapper}>
        <div className={classes.titleSelectWrapper}>
          <div className={classes.titleSelectWrapper}>
            <Typography variant="h2">{t('STORM - Global view')}</Typography>
          </div>
        </div>
      </div>
    </div>
  );
}

const useStyles = makeStyles(() =>
  createStyles({
    anticipatoryActionPanel: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      height: '100%',
      justifyContent: 'space-between',
    },
    headerWrapper: {
      padding: '1rem 1rem 0 1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.50rem',
    },
    titleSelectWrapper: {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
    },
  }),
);

export default AnticipatoryActionStormPanel;
