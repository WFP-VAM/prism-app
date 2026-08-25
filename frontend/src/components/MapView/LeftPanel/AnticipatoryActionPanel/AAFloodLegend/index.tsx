import { Visibility } from '@mui/icons-material';
import { Box, Divider, Typography } from '@mui/material';
import { AAFloodColors } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/AnticipatoryActionFloodPanel/constants';
import { getFloodRiskColor } from 'context/anticipatoryAction/AAFloodStateSlice/utils';
import { useSafeTranslation } from 'i18n';
import { black } from 'muiTheme';

import { aaFloodLegendSx } from '../aaPanelStyles';

function AAFloodLegend() {
  const { t } = useSafeTranslation();

  const categories = [
    {
      color: getFloodRiskColor('Severe'),
      label: 'Severe',
    },
    {
      color: getFloodRiskColor('Moderate'),
      label: 'Moderate',
    },
    {
      color: getFloodRiskColor('Bankfull'),
      label: 'Bankfull',
    },
    {
      color: getFloodRiskColor('Not exceeded'),
      label: 'Not exceeded',
    },
    {
      color: AAFloodColors.riskLevels.noData,
      label: 'No data',
    },
  ];

  const handleGlofasClick = () => {
    window.open('https://global-flood.emergency.copernicus.eu/', '_blank');
  };

  return (
    <div>
      <Box sx={aaFloodLegendSx.header}>
        <Box sx={aaFloodLegendSx.title}>
          <Visibility style={{ color: black }} />
          <Typography variant="h3" style={{ fontWeight: 'bold' }}>
            {t('Legend')}
          </Typography>
        </Box>
      </Box>

      <Typography sx={aaFloodLegendSx.sectionTitle}>
        {t('Riverine flood forecast')}
      </Typography>

      {categories.map(category => (
        <Box key={category.label} sx={aaFloodLegendSx.itemWrapper}>
          <Box
            sx={aaFloodLegendSx.categoryCircle}
            style={{ backgroundColor: category.color }}
          />
          <Typography sx={aaFloodLegendSx.itemText}>
            {t(category.label)}
          </Typography>
        </Box>
      ))}

      <Divider sx={aaFloodLegendSx.divider} />

      <Typography sx={aaFloodLegendSx.description}>
        {t(
          'Probability of flooding at various severity categories based on GloFAS data. Visit',
        )}{' '}
        <Box
          component="span"
          sx={aaFloodLegendSx.link}
          onClick={handleGlofasClick}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleGlofasClick();
            }
          }}
        >
          {t('GloFAS')}
        </Box>{' '}
        {t('to learn more about flood forecasting models.')}
      </Typography>
    </div>
  );
}

export default AAFloodLegend;
