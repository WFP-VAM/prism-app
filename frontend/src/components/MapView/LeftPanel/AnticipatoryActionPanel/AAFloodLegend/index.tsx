import {
  Typography,
  makeStyles,
  createStyles,
  Divider,
} from '@material-ui/core';
import { useSafeTranslation } from 'i18n';
import { getFloodRiskColor } from 'context/anticipatoryAction/AAFloodStateSlice/utils';

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
      color: getFloodRiskColor('Below bankfull'),
      label: 'Not exceeded',
    },
    {
      color: '#9E9E9E', // Gray for no data
      label: 'No data',
    },
  ];

  const handleGoogleResearchClick = () => {
    window.open('https://research.google/', '_blank');
  };

  return (
    <div>
      <Typography className={classes.sectionTitle}>
        {t('River discharge forecast')}
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
        {t('River discharge forecast at verified gauges. Visit')}{' '}
        <span
          className={classes.link}
          onClick={handleGoogleResearchClick}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleGoogleResearchClick();
            }
          }}
        >
          {t('Google Research')}
        </span>{' '}
        {t('to learn more about their AI forecasting models.')}
      </Typography>
    </div>
  );
}

export default AAFloodLegend;
