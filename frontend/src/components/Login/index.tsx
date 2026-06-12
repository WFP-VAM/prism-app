import { useMsal } from '@azure/msal-react';
import { Button, Grid, Typography } from '@mui/material';
import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
import { usePostHog } from '@posthog/react';
import { wfpLogo } from 'assets/images';
import { msalRequest } from 'config';
import { colors } from 'muiTheme';
import { useCallback } from 'react';

function Login() {
  const classes = useStyles();
  const { instance } = useMsal();
  const posthog = usePostHog();

  const handleLogin = useCallback(() => {
    posthog?.capture('login_clicked');
    instance.loginPopup(msalRequest).catch(() => {});
  }, [instance, posthog]);

  return (
    <div className={classes.container}>
      <Grid container spacing={3} className={classes.content}>
        <Grid>
          <Typography variant="h3" color="textPrimary" gutterBottom>
            Login Required
          </Typography>
          <Typography variant="body1" gutterBottom>
            This PRISM instance requires users to be authenticated using WFP
            credentials.
          </Typography>
          <br />
          <Button variant="contained" onClick={handleLogin}>
            Login
          </Button>
        </Grid>

        <Grid>
          <img
            className={classes.image}
            src={wfpLogo}
            alt="World Food Programme logo"
          />
        </Grid>
      </Grid>
    </div>
  );
}

const useStyles = makeStyles(() =>
  createStyles({
    container: {
      width: '100vw',
      height: '100vh',
      backgroundColor: colors.greyBlue,
      display: 'flex',
      justifyContent: 'center',
    },

    content: {
      margin: 'auto',
      maxWidth: '50vw',
    },

    image: {
      width: '90%',
      opacity: '0.5',
    },
  }),
);

export default Login;
