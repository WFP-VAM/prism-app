import { Typography, MenuItem, Input } from '@mui/material';
import React from 'react';
import { makeStyles, createStyles } from '@mui/styles';
import { useSafeTranslation } from 'i18n';
import { useDispatch } from 'context/hooks';
import { updateDateRange } from 'context/mapStateSlice';
import {
  setSelectedStormName,
  ExtendedDateItem,
} from 'context/anticipatoryAction/AAStormStateSlice/index';
import { AnticipatoryAction, PanelSize } from 'config/types';
import { getFormattedDate } from 'utils/date-utils';
import { DateFormat } from 'utils/name-utils';
import { useUrlHistory } from 'utils/url-utils';
import HowToReadModal from '../HowToReadModal';
import ActivationTrigger from './ActivationTriggerView';
import { StyledSelect, useAACommonStyles } from '../utils';
import { useAnticipatoryAction } from '../useAnticipatoryAction';
import ReadyTrigger from './ReadyTriggerView';
import DownloadGeoJSONButton from './DownloadGeoJSONButton';

function AnticipatoryActionStormPanel() {
  const classes = useStyles();
  const dispatch = useDispatch();
  const { updateHistory } = useUrlHistory();
  const { t } = useSafeTranslation();
  const { AAData, AAAvailableDates } = useAnticipatoryAction(
    AnticipatoryAction.storm,
  );
  const commonClasses = useAACommonStyles();
  const [howToReadModalOpen, setHowToReadModalOpen] = React.useState(false);
  const reportRefTime = AAData.forecastDetails?.reference_time;

  const date = getFormattedDate(
    reportRefTime,
    DateFormat.MiddleEndian,
  ) as string;
  const hour = getFormattedDate(reportRefTime, DateFormat.TimeOnly) as string;

  if (!AAAvailableDates) {
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
          value={
            reportRefTime && AAData.forecastDetails?.cyclone_name
              ? `${getFormattedDate(reportRefTime, 'default')} ${AAData.forecastDetails.cyclone_name.toUpperCase()}`
              : ''
          }
          input={<Input disableUnderline />}
          renderValue={() => (
            <Typography variant="body1" className={classes.selectText}>
              {date ? (
                <>
                  CYCLONE{' '}
                  {t(AAData.forecastDetails?.cyclone_name || 'Unknown Cyclone')}{' '}
                  {hour} UTC
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
            // Create a menu item for each date-storm combination
            (AAAvailableDates as ExtendedDateItem[]).flatMap(stormDate =>
              stormDate.stormNames.map(stormName => (
                <MenuItem
                  key={`${stormName}-${stormDate.displayDate}`}
                  value={`${getFormattedDate(stormDate.displayDate, 'default')} ${stormName.toUpperCase()}`}
                  onClick={() => {
                    updateHistory(
                      'date',
                      getFormattedDate(
                        stormDate.displayDate,
                        'default',
                      ) as string,
                    );
                    dispatch(
                      updateDateRange({ startDate: stormDate.displayDate }),
                    );
                    dispatch(setSelectedStormName(stormName));
                  }}
                >
                  {`${getFormattedDate(stormDate.displayDate, DateFormat.Default)} ${stormName.toUpperCase()}`}
                </MenuItem>
              )),
            )}
        </StyledSelect>

        <Typography>
          {t(
            'The wind forecast shows areas with wind speeds above 89 and 119 km/h.',
          )}
        </Typography>
      </div>
      {AAData.readiness ? <ReadyTrigger /> : <ActivationTrigger dialogs={[]} />}
      <div className={commonClasses.footerWrapper}>
        <div className={commonClasses.footerDialogsWrapper}>
          <DownloadGeoJSONButton />
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
