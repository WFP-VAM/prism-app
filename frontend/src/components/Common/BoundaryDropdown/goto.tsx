import React from 'react';
import { makeStyles, Theme } from '@material-ui/core';
import { CenterFocusWeak } from '@material-ui/icons';
import BoundaryDropdown, { MapInteraction } from '.';

import { useSafeTranslation } from '../../../i18n';

const useStyles = makeStyles((theme: Theme) => ({
  button: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.text.primary,
    display: 'inline-flex',
    marginTop: '1em',
    padding: theme.spacing(1, 2.66),
    borderRadius: '4px',
    alignItems: 'center',
    boxShadow: theme.shadows[2],
    width: '12vw',
    paddingLeft: '1em',
    paddingRight: '1em',
  },
  icon: {
    alignSelf: 'end',
    marginBottom: '0.4em',
  },
  selectContainer: {
    width: '100%',
    marginLeft: '0.8em',
  },
}));

const GoToBoundaryDropdown = () => {
  const styles = useStyles();
  const { t } = useSafeTranslation();

  return (
    <>
      <div className={styles.button}>
        <CenterFocusWeak fontSize="small" className={styles.icon} />
        <div className={styles.selectContainer}>
          <BoundaryDropdown
            labelText={t('Go To')}
            interaction={MapInteraction.GoTo}
          />
        </div>
      </div>
    </>
  );
};

export default GoToBoundaryDropdown;
