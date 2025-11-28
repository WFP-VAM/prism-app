import {Typography,
  Button,
  Grid} from '@mui/material';
import { useMsal } from '@azure/msal-react';
import { makeStyles, createStyles } from '@mui/styles';
import { msalRequest } from 'config';

import { colors } from 'muiTheme';
import wfpLogo from 'public/images/wfp_logo.png';

function Login() {
  const classes = useStyles();
  const { instance } = useMsal();

  return (
    <div className={classes.container}>
      <Grid container spacing={3} className={classes.content}>
        <Grid item>
          <Typography variant="h3" color="textPrimary" gutterBottom>
            Login Required
          </Typography>
          <Typography variant="body1" gutterBottom>
            This PRISM instance requires users to be authenticated using WFP
            credentials.
          </Typography>
          <br />
          <Button
            variant="contained"
            onClick={() => instance.loginPopup(msalRequest).catch(() => {})}
          >
            Login
          </Button>
        </Grid>

        <Grid item>
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
