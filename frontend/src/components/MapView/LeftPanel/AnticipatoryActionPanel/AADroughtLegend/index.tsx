import { Box, Divider, Typography } from '@mui/material';
import { useSafeTranslation } from 'i18n';
import { borderGray } from 'muiTheme';
import React from 'react';

import { aaCommonSx, aaDroughtLegendSx } from '../aaPanelStyles';
import {
  getDescriptionText,
  getLegendPhases,
} from '../AnticipatoryActionDroughtPanel/utils/countryConfig';
import HowToReadModal from '../HowToReadModal';

function AADroughtLegend({ showDescription = true }: AADroughtLegendProps) {
  const [open, setOpen] = React.useState(false);
  const { t } = useSafeTranslation();

  const phases = getLegendPhases();
  const descriptionText = getDescriptionText();

  return (
    <>
      <HowToReadModal open={open} onClose={() => setOpen(false)} />

      <Typography variant="h3" style={{ fontWeight: 'bold' }}>
        {t('Phases')}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          marginBottom: '0.75rem',
        }}
      >
        {phases.map(x => (
          <Box
            key={`${x.phase}_${x.severity}`}
            sx={aaDroughtLegendSx.itemWrapper}
          >
            {x.icon}
            <div>
              <Typography style={{ whiteSpace: 'nowrap' }}>
                {t(x.phase)}
              </Typography>
              {x.severity && (
                <Typography style={{ whiteSpace: 'nowrap' }}>
                  {t(x.severity)}
                </Typography>
              )}
            </div>
          </Box>
        ))}
      </Box>
      {showDescription && (
        <>
          <Typography>
            {
              // TODO: handle onKeyDown

              <Box
                component="span"
                sx={aaDroughtLegendSx.dialogButton}
                onClick={() => setOpen(true)}
                // onKeyDown={e => console.log(e)}
                role="button"
                tabIndex={0}
              >
                {t('The "Ready, Set & Go!" system')}
              </Box>
            }{' '}
            {t(descriptionText)}
          </Typography>
          <Divider />

          <Typography variant="h3" style={{ fontWeight: 'bold' }}>
            {t('Districts')}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <Box sx={aaDroughtLegendSx.itemWrapper}>
              <Box
                sx={{
                  minWidth: '2.2rem',
                  border: `1px solid ${borderGray}`,
                  borderRadius: '2px',
                }}
              />
              <Typography>{t('District')}</Typography>
            </Box>
            <Box sx={aaDroughtLegendSx.itemWrapper}>
              <Box sx={aaCommonSx.newTag}>{t('NEW')}</Box>
              <Typography>{t('District in new phase this month')}</Typography>
            </Box>
          </Box>
        </>
      )}
    </>
  );
}

interface AADroughtLegendProps {
  showDescription?: boolean;
}
export default AADroughtLegend;
