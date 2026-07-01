import { Box, Input, MenuItem, Typography } from '@mui/material';
import { AnticipatoryAction, PanelSize } from 'config/types';
import {
  ExtendedDateItem,
  setSelectedStormName,
} from 'context/anticipatoryAction/AAStormStateSlice/index';
import { updateDateRange } from 'context/mapStateSlice';
import { useSafeTranslation } from 'i18n';
import React from 'react';
import { useDispatch } from 'react-redux';
import { getFormattedDate } from 'utils/date-utils';
import { DateFormat } from 'utils/name-utils';
import { useUrlHistory } from 'utils/url-utils';

import { aaCommonSx, aaStormPanelSx } from '../aaPanelStyles';
import HowToReadModal from '../HowToReadModal';
import { useAnticipatoryAction } from '../useAnticipatoryAction';
import { StyledSelect } from '../utils';
import ActivationTrigger from './ActivationTriggerView';
import DownloadGeoJSONButton from './DownloadGeoJSONButton';
import ReadyTrigger from './ReadyTriggerView';

function AnticipatoryActionStormPanel() {
  const dispatch = useDispatch();
  const { updateHistory } = useUrlHistory();
  const { t } = useSafeTranslation();
  const { AAData, AAAvailableDates } = useAnticipatoryAction(
    AnticipatoryAction.storm,
  );
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
    <Box
      sx={aaStormPanelSx.anticipatoryActionPanel}
      style={{ width: PanelSize.medium }}
    >
      <HowToReadModal
        open={howToReadModalOpen}
        onClose={() => setHowToReadModalOpen(false)}
      />
      <Box sx={aaStormPanelSx.headerWrapper}>
        <Box sx={aaStormPanelSx.titleSelectWrapper}>
          <Typography variant="h2">{t('STORM - Global view')}</Typography>
        </Box>
        <StyledSelect
          sx={aaStormPanelSx.select}
          value={
            reportRefTime && AAData.forecastDetails?.cyclone_name
              ? `${getFormattedDate(reportRefTime, 'default')} ${AAData.forecastDetails.cyclone_name.toUpperCase()}`
              : ''
          }
          input={<Input disableUnderline />}
          renderValue={() => (
            <Typography variant="body1" sx={aaStormPanelSx.selectText}>
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
      </Box>
      {AAData.readiness ? <ReadyTrigger /> : <ActivationTrigger dialogs={[]} />}
      <Box sx={aaCommonSx.footerWrapper}>
        <Box sx={aaCommonSx.footerDialogsWrapper}>
          <DownloadGeoJSONButton />
        </Box>
      </Box>
    </Box>
  );
}

export default AnticipatoryActionStormPanel;
