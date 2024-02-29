import React from 'react';
import {
  Button,
  createStyles,
  Menu,
  MenuItem,
  Theme,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import { languages, useSafeTranslation } from 'i18n';
import { appConfig } from 'config';
import { get } from 'lodash';
import ArrowDownward from '@material-ui/icons/ArrowDropDown';

function LanguageSelector({ classes }: LanguageSelectorProps) {
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
    handleClose();
  };

  React.useEffect(() => {
    const locale = get(appConfig, 'defaultLanguage', 'en');
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
        <Typography color="secondary">{i18n.resolvedLanguage}</Typography>
      </Button>
      <Menu
        open={Boolean(anchorEl)}
        onClose={handleClose}
        className={classes.block}
        anchorEl={anchorEl}
      >
        {languages.map(lng => (
          <MenuItem key={lng} onClick={() => handleChangeLanguage(lng)}>
            <Typography>{lng}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    block: {
      paddingLeft: '10px',
      paddingTop: '4px',
    },
  });

export interface LanguageSelectorProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(LanguageSelector);
