import React from 'react';
import { useTranslation } from 'react-i18next';
import { createStyles, Theme, withStyles, WithStyles } from '@material-ui/core';
import { languages } from '../../../i18n';

function LanguageSelector({ classes }: LanguageSelectorProps) {
  const { i18n } = useTranslation();

  return (
    <div className={classes.label}>
      {languages.map(lng => (
        <button
          key={lng}
          style={{
            fontWeight: i18n.resolvedLanguage === lng ? 'bold' : 'normal',
          }}
          type="submit"
          onClick={() => i18n.changeLanguage(lng)}
        >
          {lng}
        </button>
      ))}
    </div>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    label: {
      marginLeft: '10px',
    },
    title: {
      color: theme.palette.text.secondary,
    },
  });

export interface LanguageSelectorProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(LanguageSelector);
