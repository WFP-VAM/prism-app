import React from 'react';
import { makeStyles, Theme } from '@material-ui/core';
import { CenterFocusWeak } from '@material-ui/icons';
import { useSafeTranslation } from 'i18n';
import BoundaryDropdown, { MapInteraction } from '.';

// TODO - Dedup files and styling in BoundaryDropdown.tsx
const useStyles = makeStyles((theme: Theme) => ({
  button: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.text.primary,
    display: 'inline-flex',
    padding: theme.spacing(0.8, 2.66),
    borderRadius: '4px',
    alignItems: 'center',
    boxShadow: theme.shadows[2],
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
        <CenterFocusWeak fontSize="small" />
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
