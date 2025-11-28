import React from 'react';
import { makeStyles, createStyles } from '@mui/styles';
import { Button, Menu, MenuItem, Typography } from '@mui/material';
import { languages, useSafeTranslation } from 'i18n';
import { appConfig } from 'config';
import { get } from 'lodash';
import ArrowDownward from '@mui/icons-material/ArrowDropDown';

function LanguageSelector() {
  const classes = useStyles();
  const { i18n } = useSafeTranslation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleChangeLanguage = (lng: string): void => {
    i18n.changeLanguage(lng);
    localStorage.setItem('userLanguage', lng);
    handleClose();
  };

  React.useEffect(() => {
    const savedLanguage = localStorage.getItem('userLanguage');
    const defaultLocale = get(appConfig, 'defaultLanguage', 'en');
    const locale = savedLanguage || defaultLocale;

    if (languages.includes(locale)) {
      i18n.changeLanguage(locale);
    }
  }, [i18n]);

  // If there is only one language, hide the selector
  if (languages.length <= 1) {
    return null;
  }

  return (
    <>
      <Button
        aria-label="language-select-dropdown-button"
        style={{ paddingLeft: 0 }}
        onClick={handleClick}
        endIcon={<ArrowDownward fontSize="small" />}
      >
        <Typography color="secondary" style={{ textTransform: 'none' }}>
          {i18n.resolvedLanguage}
        </Typography>
      </Button>
      <Menu
        open={Boolean(anchorEl)}
        onClose={handleClose}
        className={classes.block}
        anchorEl={anchorEl}
      >
        {languages.map(lng => (
          <MenuItem
            aria-label={`language-select-dropdown-menu-item-${lng}`}
            key={lng}
            onClick={() => handleChangeLanguage(lng)}
          >
            <Typography>{lng}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

const useStyles = makeStyles(() =>
  createStyles({
    block: {
      paddingLeft: '10px',
      paddingTop: '4px',
    },
  }),
);

export interface LanguageSelectorProps {}

export default LanguageSelector;
