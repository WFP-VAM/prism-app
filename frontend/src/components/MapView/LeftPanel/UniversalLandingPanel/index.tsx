import { Search } from '@mui/icons-material';
import {
  Box,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import { PanelSize } from 'config/types';
import { useSafeTranslation } from 'i18n';
import { memo, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { getUniversalMapPath } from 'utils/universal-routing';
import { getUniversalCountries } from 'utils/universal-utils';

const UniversalLandingPanel = memo(() => {
  const history = useHistory();
  const { t } = useSafeTranslation();
  const [query, setQuery] = useState('');

  const countries = useMemo(() => getUniversalCountries(), []);

  const filteredCountries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return countries;
    }
    return countries.filter(
      c => c.name.toLowerCase().includes(q) || c.iso3.toLowerCase().includes(q),
    );
  }, [countries, query]);

  const handleCountryClick = (iso3: string) => {
    history.push(getUniversalMapPath(iso3));
  };

  return (
    <Box
      sx={{
        width: PanelSize.medium,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        p: '1rem',
        boxSizing: 'border-box',
      }}
    >
      <Box sx={{ mb: '1rem' }}>
        <Typography
          variant="body2"
          sx={{
            color: '#666',
            mt: '0.75rem',
            lineHeight: 1.5,
            textTransform: 'none',
            letterSpacing: 'normal',
          }}
        >
          {t(
            'Select a country to explore hazard and vulnerability data across the world.',
          )}
        </Typography>
      </Box>

      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 600, color: '#333', mb: '0.5rem' }}
      >
        {t('Countries')}
      </Typography>

      <TextField
        sx={{ mb: '0.5rem', flexShrink: 0 }}
        fullWidth
        size="small"
        variant="outlined"
        placeholder={t('Search')}
        value={query}
        onChange={e => setQuery(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      {filteredCountries.length === 0 ? (
        <Typography
          variant="body2"
          sx={{
            color: '#666',
            py: '1rem 0',
            textAlign: 'center',
            textTransform: 'none',
            letterSpacing: 'normal',
          }}
        >
          {t('No countries match "{{query}}"', { query })}
        </Typography>
      ) : (
        <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }} dense>
          {filteredCountries.map(country => (
            <ListItemButton
              key={country.iso3}
              sx={{
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: 'rgba(0, 158, 224, 0.08)',
                },
              }}
              onClick={() => handleCountryClick(country.iso3)}
            >
              <ListItemText
                primary={country.name}
                slotProps={{
                  primary: {
                    sx: {
                      color: '#333',
                      textTransform: 'none',
                      letterSpacing: 'normal',
                    },
                  },
                }}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
});

export default UniversalLandingPanel;
