import { memo } from 'react';
import { Box, Typography } from '@material-ui/core';
import { useSafeTranslation } from 'i18n';

const DashboardView = memo(() => {
  const { t } = useSafeTranslation();

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        padding: '2rem',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Typography variant="h4" gutterBottom>
        {t('Dashboard')}
      </Typography>
      <Typography variant="body1" color="textSecondary">
        {t('Dashboard view coming soon...')}
      </Typography>
    </Box>
  );
});

export default DashboardView;
