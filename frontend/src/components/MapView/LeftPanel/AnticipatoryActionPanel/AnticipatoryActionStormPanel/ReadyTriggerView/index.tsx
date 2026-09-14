import { Box, Typography } from '@mui/material';
import { AADataSelector } from 'context/anticipatoryAction/AAStormStateSlice';
import { useSafeTranslation } from 'i18n';
import { useSelector } from 'react-redux';

import { aaStormTriggerSx } from '../../aaPanelStyles';

function ReadyTrigger() {
  const { t } = useSafeTranslation();
  const parsedStormData = useSelector(AADataSelector);

  if (!parsedStormData.readiness) {
    return null;
  }

  return (
    <Box sx={aaStormTriggerSx.root}>
      <Typography sx={aaStormTriggerSx.headerText}>
        {t('Readiness trigger')}
      </Typography>

      <Box sx={aaStormTriggerSx.wrapper}>
        <Box sx={aaStormTriggerSx.headColumnWrapper}>
          <Box sx={aaStormTriggerSx.headColumn}>
            <Typography sx={aaStormTriggerSx.headColumnText}>
              {t('Readiness')}
            </Typography>
          </Box>
          <Box sx={aaStormTriggerSx.rowWrapper}>
            <Typography>
              {t(
                `A system with severe tropical storm-force winds (or stronger) is expected to impact any of the coastal provinces within the next five days, with a lead time of at least 72 hours.`,
              )}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default ReadyTrigger;
