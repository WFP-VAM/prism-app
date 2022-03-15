import React from 'react';
import { useTranslation } from 'react-i18next';
import Moment from 'moment';
import { extendMoment } from 'moment-range';
import { createStyles, Theme, withStyles, WithStyles } from '@material-ui/core';
import { isLocalLanguageChosen, languages, safeTranslate } from '../../../i18n';

function LanguageSelector({ classes }: LanguageSelectorProps) {
  const { t, i18n } = useTranslation();

  const moment = extendMoment(Moment as any);

  const handleChangeLanguage = (lng: string): void => {
    i18n.changeLanguage(lng);
    moment.locale(
      isLocalLanguageChosen(i18n) ? safeTranslate(t, 'date_locale') : 'en',
    );
  };
  // If there is only one language, hide the selector
  if (languages.length <= 1) {
    return <></>;
  }

  return (
    <div className={classes.block}>
      {languages.map(lng => (
        <button
          key={lng}
          style={{
            fontWeight: i18n.resolvedLanguage === lng ? 'bold' : 'normal',
          }}
          type="submit"
          onClick={() => handleChangeLanguage(lng)}
        >
          {lng}
        </button>
      ))}
    </div>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    block: {
      marginLeft: '10px',
    },
    title: {
      color: theme.palette.text.secondary,
    },
  });

export interface LanguageSelectorProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(LanguageSelector);
