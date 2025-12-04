import {
  Box,
  createStyles,
  makeStyles,
  Typography,
  useMediaQuery,
  useTheme,
} from '@material-ui/core';
import { appConfig } from 'config';
import { t } from 'i18next';

const { header } = appConfig;

function Title() {
  const classes = useStyles();
  const theme = useTheme();

  const smDown = useMediaQuery(theme.breakpoints.down('sm'));

  const { title, subtitle, logo } = header || {
    title: 'PRISM',
  };

  // Ensure logo path is absolute to prevent routing conflicts
  const logoSrc = logo && logo.startsWith('images/') ? `/${logo}` : logo;

  return (
    !smDown && (
      <div className={classes.titleContainer}>
        {logo && <img className={classes.logo} src={logoSrc} alt="logo" />}
        <Box className={classes.titleBox}>
          {title && (
            <Typography
              color="secondary"
              variant="h6"
              className={classes.title}
            >
              {t(title)}
            </Typography>
          )}
          {subtitle && (
            <Typography
              color="secondary"
              variant="subtitle2"
              className={classes.subtitle}
            >
              {t(subtitle)}
            </Typography>
          )}
        </Box>
      </div>
    )
  );
}

const useStyles = makeStyles(() =>
  createStyles({
    titleContainer: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'start',
      gap: '1rem',
      alignItems: 'center',
    },
    titleBox: {
      display: 'flex',
      flexDirection: 'column',
    },
    logo: {
      height: 32,
      marginRight: 15,
    },
    title: {
      letterSpacing: '.3rem',
      fontSize: '1.25rem',
      lineHeight: '1.5rem',
      textTransform: 'uppercase',
      padding: 0,
    },
    subtitle: {
      fontSize: '.8rem',
      fontWeight: 300,
      letterSpacing: '.1rem',
      lineHeight: '.8rem',
      padding: 0,
    },
  }),
);

export default Title;
