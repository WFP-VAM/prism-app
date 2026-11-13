import {
  Box,
  createStyles,
  Divider,
  makeStyles,
  Typography,
} from '@material-ui/core';
import { Visibility } from '@material-ui/icons';
import { useSafeTranslation } from 'i18n';
import { black } from 'muiTheme';

import { FloodStatusIcon } from '../FloodStatusIcon';

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
      boxSizing: 'border-box',
    },
    phaseBadge: {
      width: 18,
      height: 18,
      borderRadius: '50%',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    phaseIcon: {
      fontSize: 13,
    },
    groupTitle: {
      fontWeight: 600,
      fontSize: '0.85rem',
      color: '#6b6b6b',
      margin: '0.65rem 0 0.35rem',
    },
    groupHint: {
      display: 'block',
      fontWeight: 500,
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

const PHASE_SEVERITIES = ['Severe', 'Moderate', 'Bankfull'] as const;

function AAFloodLegend() {
  const classes = useStyles();
  const { t } = useSafeTranslation();

  const phases = [
    {
      label: 'Active',
      hint: '(activation trigger)',
      variant: 'alert' as const,
    },
    {
      label: 'Readiness',
      hint: '(readiness trigger)',
      variant: 'clock' as const,
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

      {phases.map(({ label, hint, variant }) => (
        <div key={label}>
          <Typography className={classes.groupTitle}>
            {t(label)}
            <span className={classes.groupHint}>{t(hint)}</span>
          </Typography>
          {PHASE_SEVERITIES.map(severity => (
            <div key={`${label}-${severity}`} className={classes.itemWrapper}>
              <FloodStatusIcon
                phase={variant === 'alert' ? 'activation' : 'readiness'}
                riskLevel={severity}
                size={18}
              />
              <Typography className={classes.itemText}>
                {`${t(label)} — ${t(severity)}`}
              </Typography>
            </div>
          ))}
        </div>
      ))}

      <div className={classes.itemWrapper} style={{ marginTop: '0.65rem' }}>
        <FloodStatusIcon riskLevel="Not exceeded" size={12} />
        <Typography className={classes.itemText}>
          {t('Not exceeded')}
        </Typography>
      </div>
      <div className={classes.itemWrapper}>
        <FloodStatusIcon riskLevel="No data" size={12} />
        <Typography className={classes.itemText}>{t('No data')}</Typography>
      </div>

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
