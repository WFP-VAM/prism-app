import React from 'react';
import {
  createStyles,
  WithStyles,
  withStyles,
  Typography,
  Button,
  Grid,
} from '@material-ui/core';
import { useMsal } from '@azure/msal-react';
import { msalRequest } from '../../config';

import { colors } from '../../muiTheme';

const Login = ({ classes }: LoginProps) => {
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
            src="images/wfp_logo.png"
            alt="World Food Programme logo"
          />
        </Grid>
      </Grid>
    </div>
  );
};

const styles = () =>
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
  });

export interface LoginProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(Login);
