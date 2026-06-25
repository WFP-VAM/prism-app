import { Box, createStyles, makeStyles, Typography } from '@material-ui/core';
import { wfpLogo } from 'assets/images';
import { useSafeTranslation } from 'i18n';
import { colors } from 'muiTheme';

function UniversalPlaceholder() {
  const classes = useStyles();
  const { t } = useSafeTranslation();

  return (
    <div className={classes.root}>
      <div className={classes.card}>
        <Typography className={classes.brand} variant="h6">
          {t('PRISM')}
        </Typography>

        <Box className={classes.divider} />

        <Typography className={classes.heading}>
          {t('Universal deployment')}
        </Typography>

        <Typography className={classes.body}>
          {t('Select a country to explore hazard and vulnerability data.')}
        </Typography>

        <img
          className={classes.logo}
          src={wfpLogo}
          alt={t('World Food Programme logo')}
        />
      </div>
    </div>
  );
}

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.darkGreyBlue,
      backgroundImage:
        'radial-gradient(ellipse at 50% 0%, rgba(0,158,224,0.08) 0%, transparent 70%)',
    },

    card: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      maxWidth: 420,
      padding: '48px 40px',
      borderRadius: 8,
      backgroundColor: 'rgba(50, 54, 56, 0.85)',
      border: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(12px)',
    },

    brand: {
      letterSpacing: '.3rem',
      fontSize: '1.5rem',
      textTransform: 'uppercase',
      color: '#fff',
      fontWeight: 400,
    },

    divider: {
      width: 40,
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.skyBlue,
      margin: '16px 0 28px',
    },

    heading: {
      fontSize: 18,
      fontWeight: 500,
      color: '#fff',
      marginBottom: 12,
      textAlign: 'center',
    },

    body: {
      fontSize: 14,
      fontWeight: 300,
      color: 'rgba(255,255,255,0.7)',
      textAlign: 'center',
      lineHeight: 1.6,
      marginBottom: 28,
    },

    logo: {
      width: 120,
      opacity: 0.3,
    },
  }),
);

export default UniversalPlaceholder;
