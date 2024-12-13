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
  setAAFilters,
} from 'context/anticipatoryAction/AAStormStateSlice';
import { AnticipatoryAction, PanelSize } from 'config/types';
import { updateDateRange } from 'context/mapStateSlice';
import { useDefaultDate } from 'utils/useDefaultDate';
import { getFormattedDate } from 'utils/date-utils';
import { getRequestDate } from 'utils/server-utils';
import { DateFormat } from 'utils/name-utils';
import HowToReadModal from '../HowToReadModal';
import ActivationTrigger from './ActivationTriggerView';
import { StyledSelect } from '../utils';
import { useAnticipatoryAction } from '../useAnticipatoryAction';

function AnticipatoryActionStormPanel() {
  const classes = useStyles();
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();
  const { AAData } = useAnticipatoryAction(AnticipatoryAction.storm);
  const AAAvailableDates = useSelector(AAAvailableDatesSelector);
  const [howToReadModalOpen, setHowToReadModalOpen] = React.useState(false);

  const selectedDate = useDefaultDate('anticipatory_action_storm');

  const [viewType, setViewType] = React.useState<'forecast' | 'risk'>(
    'forecast',
  );

  const queryDate = getRequestDate(AAAvailableDates, selectedDate);
  const date = getFormattedDate(queryDate, DateFormat.MiddleEndian) as string;
  const hour = getFormattedDate(queryDate, DateFormat.TimeOnly) as string;

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
        <StyledSelect
          className={classes.select}
          value={date || 'empty'}
          input={<Input disableUnderline />}
          renderValue={() => (
            <Typography variant="body1" className={classes.selectText}>
              {date ? (
                <>
                  CYCLONE{' '}
                  {t(AAData.forecastDetails?.cyclone_name || 'Unknown Cyclone')}{' '}
                  {hour}
                  <br />
                  {date} FORECAST
                </>
              ) : (
                t('Timeline')
              )}
            </Typography>
          )}
        >
          {AAAvailableDates &&
            AAAvailableDates.map(x => (
              <MenuItem
                key={getFormattedDate(x.queryDate, DateFormat.Default)}
                value={getFormattedDate(x.queryDate, DateFormat.Default)}
                onClick={() => {}}
              >
                {t(getFormattedDate(x.queryDate, DateFormat.Default) as string)}
              </MenuItem>
            ))}
        </StyledSelect>
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
      padding: '0rem 0.5rem',
    },
    selectText: {
      fontSize: '18px',
      fontWeight: 600,
      lineHeight: '18px',
      whiteSpace: 'normal',
      wordWrap: 'break-word',
    },
  }),
);

export default AnticipatoryActionStormPanel;
