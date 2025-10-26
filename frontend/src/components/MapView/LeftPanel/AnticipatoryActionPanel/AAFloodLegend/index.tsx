import {
  Typography,
  makeStyles,
  createStyles,
  Divider,
  Box,
} from '@material-ui/core';
import { black } from 'muiTheme';
import { Visibility } from '@material-ui/icons';
import { useSafeTranslation } from 'i18n';
import { getFloodRiskColor } from 'context/anticipatoryAction/AAFloodStateSlice/utils';
import { AAFloodColors } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/AnticipatoryActionFloodPanel/constants';

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      padding: '0.5rem',
      minWidth: '350px',
      maxWidth: '400px',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '1rem',
    },
    title: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontWeight: 'bold',
      fontSize: '1.1rem',
    },
    closeButton: {
      padding: '4px',
    },
    sectionTitle: {
      fontWeight: 'bold',
      marginBottom: '0.75rem',
      fontSize: '0.95rem',
    },
    itemWrapper: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      marginBottom: '0.5rem',
    },
    categoryCircle: {
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      flexShrink: 0,
    },
    trendTriangle: {
      width: 0,
      height: 0,
      flexShrink: 0,
    },
    itemText: {
      fontSize: '0.9rem',
    },
    divider: {
      margin: '0.75rem 0',
    },
    description: {
      fontSize: '0.85rem',
      color: '#666',
      lineHeight: 1.4,
    },
    link: {
      textDecoration: 'underline',
      color: '#1976d2',
      cursor: 'pointer',
    },
    opacitySection: {
      marginBottom: '1rem',
    },
    sliderContainer: {
      paddingLeft: '0.5rem',
      paddingRight: '0.5rem',
    },
  }),
);

function AAFloodLegend() {
  const classes = useStyles();
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
      <Box className={classes.header}>
        <Box className={classes.title}>
          <Visibility style={{ color: black }} />
          <Typography variant="h3" style={{ fontWeight: 'bold' }}>
            {t('Legend')}
          </Typography>
        </Box>
      </Box>

      <Typography className={classes.sectionTitle}>
        {t('Riverine flood forecast')}
      </Typography>

      {categories.map(category => (
        <div key={category.label} className={classes.itemWrapper}>
          <div
            className={classes.categoryCircle}
            style={{ backgroundColor: category.color }}
          />
          <Typography className={classes.itemText}>
            {t(category.label)}
          </Typography>
        </div>
      ))}

      <Divider className={classes.divider} />

      <Typography className={classes.description}>
        {t(
          'Probability of flooding at various severity categories based on GloFAS data. Visit',
        )}{' '}
        <span
          className={classes.link}
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
        </span>{' '}
        {t('to learn more about flood forecasting models.')}
      </Typography>
    </div>
  );
}

export default AAFloodLegend;
