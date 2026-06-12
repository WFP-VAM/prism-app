import { Box, Button, Grid, Typography } from '@mui/material';
import { wfpLogo } from 'assets/images';
import { Link } from 'react-router-dom';

import {
  notFoundContainerSx,
  notFoundContentSx,
  notFoundImageSx,
} from './notFoundStyles';

function NotFound() {
  return (
    <Box sx={notFoundContainerSx}>
      <Grid container spacing={3} sx={notFoundContentSx}>
        <Grid>
          <Typography variant="h3" color="textPrimary" gutterBottom>
            404 Page Not Found
          </Typography>
          <Typography variant="h5" color="textPrimary" gutterBottom>
            Sorry, it seems we ran into a problem. We already collected
            information about this error.
          </Typography>
          <Typography variant="body1" gutterBottom>
            If you have typed the address of this web page, you may have
            misspelled it or if you redirected to this page, it may be moved to
            another location. Please go back to the website home page and try to
            find your page from the website navigation.
          </Typography>
        </Grid>

        <Grid>
          <Link to="/">
            <Button variant="contained">Back To Home</Button>
          </Link>
        </Grid>

        <Grid>
          <Box
            component="img"
            sx={notFoundImageSx}
            src={wfpLogo}
            alt="World Food Programme logo"
          />
        </Grid>
      </Grid>
    </Box>
  );
}

export default NotFound;
