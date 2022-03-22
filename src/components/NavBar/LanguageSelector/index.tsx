import React from 'react';
import {
  Button,
  ButtonGroup,
  createStyles,
  Theme,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import { languages, useSafeTranslation } from '../../../i18n';

function LanguageSelector({ classes }: LanguageSelectorProps) {
  const { i18n } = useSafeTranslation();

  const handleChangeLanguage = (lng: string): void => {
    i18n.changeLanguage(lng);
  };
  // If there is only one language, hide the selector
  if (languages.length <= 1) {
    return null;
  }

  return (
    <ButtonGroup variant="text" className={classes.block}>
      {languages.map(lng => (
        <Button
          key={lng}
          type="submit"
          onClick={() => handleChangeLanguage(lng)}
        >
          <Typography
            variant="body2"
            style={{
              fontWeight: i18n.resolvedLanguage === lng ? 'bold' : 'normal',
            }}
          >
            {lng}
          </Typography>
        </Button>
      ))}
    </ButtonGroup>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    block: {
      paddingLeft: '10px',
      paddingTop: '4px',
    },
    title: {
      color: theme.palette.text.secondary,
    },
  });

export interface LanguageSelectorProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(LanguageSelector);
