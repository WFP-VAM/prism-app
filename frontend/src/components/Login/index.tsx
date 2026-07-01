import { useMsal } from '@azure/msal-react';
import { Box, Button, Grid, Typography } from '@mui/material';
import { usePostHog } from '@posthog/react';
import { wfpLogo } from 'assets/images';
import { msalRequest } from 'config';
import { useCallback } from 'react';

import { loginContainerSx, loginContentSx, loginImageSx } from './loginStyles';

function Login() {
  const { instance } = useMsal();
  const posthog = usePostHog();

  const handleLogin = useCallback(() => {
    posthog?.capture('login_clicked');
    instance.loginPopup(msalRequest).catch(() => {});
  }, [instance, posthog]);

  return (
    <Box sx={loginContainerSx}>
      <Grid container spacing={3} sx={loginContentSx}>
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
          <Box
            component="img"
            sx={loginImageSx}
            src={wfpLogo}
            alt="World Food Programme logo"
          />
        </Grid>
      </Grid>
    </Box>
  );
}

export default Login;
