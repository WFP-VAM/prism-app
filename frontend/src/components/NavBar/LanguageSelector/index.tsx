import {
  Button,
  createStyles,
  makeStyles,
  Menu,
  MenuItem,
  Typography,
} from '@material-ui/core';
import ArrowDownward from '@material-ui/icons/ArrowDropDown';
import { appConfig } from 'config';
import { languages, useSafeTranslation } from 'i18n';
import { get } from 'lodash';
import React from 'react';

/** Display labels for the language dropdown (i18n codes stay 2-letter). */
const LANGUAGE_DROPDOWN_LABELS: Record<string, string> = {
  ar: 'عربى',
};

function languageDropdownLabel(code: string): string {
  return LANGUAGE_DROPDOWN_LABELS[code] ?? code;
}

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
          {languageDropdownLabel(i18n.resolvedLanguage ?? 'en')}
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
            <Typography>{languageDropdownLabel(lng)}</Typography>
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
