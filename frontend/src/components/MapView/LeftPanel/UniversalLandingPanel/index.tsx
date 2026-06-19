import {
  Box,
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
import { getUniversalCountries } from 'utils/universal-utils';

const UniversalLandingPanel = memo(() => {
  const classes = useStyles();
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
      textTransform: 'none',
      letterSpacing: 'normal',
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
      textTransform: 'none',
      letterSpacing: 'normal',
    },
    emptyState: {
      color: '#666',
      padding: '1rem 0',
      textAlign: 'center',
      textTransform: 'none',
      letterSpacing: 'normal',
    },
  }),
);

export default UniversalLandingPanel;
