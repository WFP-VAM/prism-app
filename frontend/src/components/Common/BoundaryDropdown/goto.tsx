import React from 'react';
import { makeStyles, Theme } from '@material-ui/core';
import { CenterFocusWeak } from '@material-ui/icons';
import BoundaryDropdown, { MapInteraction } from '.';

import { useSafeTranslation } from '../../../i18n';

// TODO - Dedup files and styling in BoundaryDropdown.tsx
const useStyles = makeStyles((theme: Theme) => ({
  button: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.text.primary,
    display: 'inline-flex',
    // temporary will be removed when the go to button will be revamped
    marginTop: '-10px',
    padding: theme.spacing(0.8, 2.66),
    borderRadius: '4px',
    alignItems: 'center',
    boxShadow: theme.shadows[2],
  },
  icon: {
    alignSelf: 'end',
    marginBottom: '0.4em',
  },
  selectContainer: {
    width: '140px',
    marginLeft: '10px',
    overflow: 'hidden',
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
