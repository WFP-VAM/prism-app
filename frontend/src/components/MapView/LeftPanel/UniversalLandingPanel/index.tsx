import {
  Box,
  CircularProgress,
  createStyles,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  makeStyles,
  TextField,
  Typography,
} from '@material-ui/core';
import { Search } from '@material-ui/icons';
import { PanelSize } from 'config/types';
import { useSafeTranslation } from 'i18n';
import { memo, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { getUniversalMapPath } from 'utils/universal-routing';
import { getCountriesFromAdmin0Features } from 'utils/universal-utils';
import { useBoundaryData } from 'utils/useBoundaryData';
import { useMapState } from 'utils/useMapState';

const UNIVERSAL_ADMIN0_LAYER_ID = 'universal_admin0_boundaries';

const UniversalLandingPanel = memo(() => {
  const classes = useStyles();
  const history = useHistory();
  const { t } = useSafeTranslation();
  const map = useMapState().maplibreMap();
  const { data, error } = useBoundaryData(UNIVERSAL_ADMIN0_LAYER_ID, map);
  const [query, setQuery] = useState('');

  const countries = useMemo(
    () => getCountriesFromAdmin0Features(data?.features),
    [data],
  );

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
    <Box className={classes.root}>
      <Box className={classes.intro}>
        <Typography variant="body2" className={classes.description}>
          {t(
            'Select a country to explore hazard and vulnerability data across the world.',
          )}
        </Typography>
      </Box>

      <Typography variant="subtitle2" className={classes.listHeading}>
        {t('Countries')}
      </Typography>

      {countries.length === 0 && error ? (
        <Typography variant="body2" className={classes.emptyState}>
          {t('Unable to load countries. Please try again.')}
        </Typography>
      ) : null}

      {countries.length === 0 && !error ? (
        <Box className={classes.loading}>
          <CircularProgress size={32} />
          <Typography variant="body2" className={classes.loadingText}>
            {t('Loading countries…')}
          </Typography>
        </Box>
      ) : null}

      {countries.length > 0 ? (
        <>
          <TextField
            className={classes.searchField}
            fullWidth
            size="small"
            variant="outlined"
            placeholder={t('Search')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          {filteredCountries.length === 0 ? (
            <Typography variant="body2" className={classes.emptyState}>
              {t('No countries match "{{query}}"', { query })}
            </Typography>
          ) : (
            <List className={classes.list} dense>
              {filteredCountries.map(country => (
                <ListItem
                  key={country.iso3}
                  button
                  className={classes.listItem}
                  onClick={() => handleCountryClick(country.iso3)}
                >
                  <ListItemText
                    primary={country.name}
                    primaryTypographyProps={{ className: classes.countryName }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </>
      ) : null}
    </Box>
  );
});

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      width: PanelSize.medium,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '1rem',
      boxSizing: 'border-box',
    },
    intro: {
      marginBottom: '1rem',
    },
    title: {
      fontWeight: 600,
      color: '#333',
    },
    subtitle: {
      color: '#666',
      marginTop: '0.25rem',
    },
    description: {
      color: '#666',
      marginTop: '0.75rem',
      lineHeight: 1.5,
    },
    listHeading: {
      fontWeight: 600,
      color: '#333',
      marginBottom: '0.5rem',
    },
    searchField: {
      marginBottom: '0.5rem',
      flexShrink: 0,
    },
    list: {
      flexGrow: 1,
      overflowY: 'auto',
      padding: 0,
    },
    listItem: {
      borderRadius: 4,
      '&:hover': {
        backgroundColor: 'rgba(0, 158, 224, 0.08)',
      },
    },
    countryName: {
      color: '#333',
    },
    emptyState: {
      color: '#666',
      padding: '1rem 0',
      textAlign: 'center',
    },
    loading: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: '0.75rem',
      flexGrow: 1,
      padding: '2rem 0',
    },
    loadingText: {
      color: '#666',
    },
  }),
);

export default UniversalLandingPanel;
