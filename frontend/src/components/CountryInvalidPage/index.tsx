import { Box, Container, Typography } from '@material-ui/core';
import { useParams } from 'react-router-dom';

function CountryInvalidPage() {
  const { iso3 } = useParams<{ iso3?: string }>();

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        py={4}
      >
        <Typography variant="h5" gutterBottom>
          Country not found
        </Typography>
        <Typography
          variant="body1"
          color="textSecondary"
          align="center"
          paragraph
        >
          {iso3
            ? `"${iso3}" is not a valid ISO3 country code (expected three letters, e.g. MOZ).`
            : 'Open a country view at /country/ISO3 (for example, /country/MOZ).'}
        </Typography>
      </Box>
    </Container>
  );
}

export default CountryInvalidPage;
