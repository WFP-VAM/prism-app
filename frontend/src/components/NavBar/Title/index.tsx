import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import { getImageUrl } from 'assets/images';
import { appConfig } from 'config';
import { t } from 'i18next';

const { header } = appConfig;

function Title() {
  const theme = useTheme();

  const smDown = useMediaQuery(theme.breakpoints.down('md'));

  const { title, subtitle, logo } = header || {
    title: 'PRISM',
  };

  const logoSrc = getImageUrl(logo);

  return (
    !smDown && (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'start',
          gap: '1rem',
          alignItems: 'center',
        }}
      >
        {logoSrc && (
          <Box
            component="img"
            src={logoSrc}
            alt="logo"
            sx={{
              height: 32,
              marginRight: '15px',
            }}
          />
        )}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {title && (
            <Typography
              color="secondary"
              variant="h6"
              sx={{
                letterSpacing: '.3rem',
                fontSize: '1.25rem',
                lineHeight: '1.5rem',
                textTransform: 'uppercase',
                padding: 0,
              }}
            >
              {t(title)}
            </Typography>
          )}
          {subtitle && (
            <Typography
              color="secondary"
              variant="subtitle2"
              sx={{
                fontSize: '.8rem',
                fontWeight: 300,
                letterSpacing: '.1rem',
                lineHeight: '.8rem',
                padding: 0,
              }}
            >
              {t(subtitle)}
            </Typography>
          )}
        </Box>
      </Box>
    )
  );
}

export default Title;
