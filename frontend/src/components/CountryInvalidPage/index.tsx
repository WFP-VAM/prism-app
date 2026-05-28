import {
  Box,
  Button,
  createStyles,
  makeStyles,
  Typography,
} from '@material-ui/core';
import { wfpLogo } from 'assets/images';
import { colors } from 'muiTheme';
import { Link, useParams } from 'react-router-dom';

function CountryInvalidPage() {
  const classes = useStyles();
  const { iso3 } = useParams<{ iso3?: string }>();

  return (
    <div className={classes.root}>
      <div className={classes.card}>
        <Typography className={classes.brand} variant="h6">
          PRISM
        </Typography>

        <Box className={classes.divider} />

        <Typography className={classes.heading}>
          {iso3 ? 'Invalid country code' : 'No country selected'}
        </Typography>

        <Typography className={classes.body}>
          {iso3
            ? `"${iso3}" is not a recognised ISO 3166-1 alpha-3 country code.`
            : 'A country code is required to load the map view.'}
        </Typography>

        <Typography className={classes.hint}>
          Navigate to <code className={classes.code}>/country/{'{ISO3}'}</code>{' '}
          using a valid three-letter code — for example,{' '}
          <code className={classes.code}>/country/moz</code>.
        </Typography>

        {/* @ts-expect-error - react-router-dom v5 types incompatible with React 18 */}
        <Link to="/country/MOZ" className={classes.link}>
          <Button variant="contained" className={classes.button}>
            Open Mozambique
          </Button>
        </Link>

        <img
          className={classes.logo}
          src={wfpLogo}
          alt="World Food Programme logo"
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
      marginBottom: 8,
    },

    hint: {
      fontSize: 13,
      fontWeight: 300,
      color: 'rgba(255,255,255,0.5)',
      textAlign: 'center',
      lineHeight: 1.6,
      marginBottom: 28,
    },

    code: {
      fontFamily: 'monospace',
      fontSize: 13,
      backgroundColor: 'rgba(0,158,224,0.12)',
      color: colors.skyBlue,
      padding: '2px 6px',
      borderRadius: 4,
    },

    link: {
      textDecoration: 'none',
      marginBottom: 32,
    },

    button: {
      backgroundColor: colors.skyBlue,
      color: '#fff',
      textTransform: 'none',
      fontWeight: 500,
      padding: '8px 28px',
      '&:hover': {
        backgroundColor: '#0086c0',
      },
    },

    logo: {
      width: 120,
      opacity: 0.3,
    },
  }),
);

export default CountryInvalidPage;
