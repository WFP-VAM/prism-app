import {
  Typography,
  createStyles,
  makeStyles,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  MenuItem,
  Input,
} from '@material-ui/core';
import React from 'react';
import { useSafeTranslation } from 'i18n';
import { useDispatch, useSelector } from 'react-redux';
import {
  AAAvailableDatesSelector,
  AADataSelector,
  setAAFilters,
} from 'context/anticipatoryAction/AAStormStateSlice';
import { PanelSize } from 'config/types';
import { useDefaultDate } from 'utils/useDefaultDate';
import { getFormattedDate } from 'utils/date-utils';
import HowToReadModal from '../HowToReadModal';
import ActivationTrigger from './ActivationTriggerView';
import { StyledSelect } from '../AnticipatoryActionDroughtPanel/utils';
import { updateDateRange } from 'context/mapStateSlice';

function AnticipatoryActionStormPanel() {
  const classes = useStyles();
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();
  const AAAvailableDates = useSelector(AAAvailableDatesSelector);
  const AAData = useSelector(AADataSelector);
  const [howToReadModalOpen, setHowToReadModalOpen] = React.useState(false);

  const selectedDate = useDefaultDate('anticipatory_action_storm');

  const [viewType, setViewType] = React.useState<'forecast' | 'risk'>(
    'forecast',
  );

  const formatDate = (timestamp: number | string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    });
  };

  React.useEffect(() => {
    dispatch(
      setAAFilters({
        viewType,
        selectedDate: getFormattedDate(selectedDate, 'default'),
      }),
    );
    dispatch(updateDateRange({ startDate: selectedDate }));
  }, [viewType, selectedDate, dispatch]);

  if (!selectedDate) {
    return null;
  }

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
          <Typography variant="h2">{t('STORM - Global view')}</Typography>
        </div>
        <div className={classes.titleSelectWrapper}>
          <div className={classes.titleSelectWrapper}>
            <StyledSelect
              className={classes.select}
              value={selectedDate || 'empty'}
              input={<Input disableUnderline />}
              renderValue={() => (
                <Typography variant="h2">
                  {selectedDate
                    ? `CYCLONE  ${t(AAData.forecastDetails?.cyclone_name || 'Unknown Cyclone')} ${getFormattedDate(selectedDate, 'default')} FORECAST`
                    : t('Timeline')}
                </Typography>
              )}
            >
              {AAAvailableDates &&
                AAAvailableDates.map(x => (
                  <MenuItem
                    key={formatDate(x.displayDate)}
                    value={formatDate(x.displayDate)}
                    onClick={() => {}}
                  >
                    {t(formatDate(x.displayDate))}
                  </MenuItem>
                ))}
            </StyledSelect>
          </div>
        </div>
        <FormControl component="fieldset">
          <RadioGroup
            aria-label="view-type"
            name="view-type"
            value={viewType}
            onChange={e => setViewType(e.target.value as 'forecast' | 'risk')}
            row
          >
            <FormControlLabel
              value="forecast"
              control={<Radio color="primary" />}
              label={t('Wind Forecast')}
            />
            <FormControlLabel
              value="risk"
              control={<Radio color="primary" />}
              label={t('Storm Risk Map')}
            />
          </RadioGroup>
        </FormControl>
        {viewType === 'forecast' && (
          <Typography>
            {t(
              'The wind forecast shows areas with wind speeds above 89 and 118 km/h.',
            )}
          </Typography>
        )}
        {viewType === 'risk' && (
          <Typography>
            {t(
              'The risk map highlights areas with at least a 20% chance of being hit by a severe tropical storm in the next 5 days.',
            )}
          </Typography>
        )}
      </div>
      <ActivationTrigger dialogs={[]} />
    </div>
  );
}

const useStyles = makeStyles(() =>
  createStyles({
    anticipatoryActionPanel: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    },
    headerWrapper: {
      padding: '1rem 1rem 0 1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
    },
    titleSelectWrapper: {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
    },
    select: {
      border: '1px solid #000',
      borderRadius: '4px',
      padding: '0.25rem',
      fontSize: '0.2rem',
    },
  }),
);

export default AnticipatoryActionStormPanel;
