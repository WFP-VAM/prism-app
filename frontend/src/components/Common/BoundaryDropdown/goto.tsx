import React from 'react';
import { useSelector } from 'react-redux';
import { makeStyles, Theme } from '@material-ui/core';
import { CenterFocusWeak } from '@material-ui/icons';
import { useSafeTranslation } from 'i18n';
import { SimpleBoundaryDropdown } from 'components/MapView/Layers/BoundaryDropdown';
import { mapSelector } from 'context/mapStateSlice/selectors';

// TODO - Dedup files and styling in BoundaryDropdown.tsx
const useStyles = makeStyles((theme: Theme) => ({
  button: {
    pointerEvents: 'auto',
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.text.primary,
    display: 'inline-flex',
    padding: theme.spacing(0.8, 2.66),
    borderRadius: '4px',
    alignItems: 'center',
    boxShadow: theme.shadows[2],
  },
  formControl: {
    width: '100%',
    '& > .MuiInputLabel-shrink': { display: 'none' },
    '& > .MuiInput-root': { margin: 0 },
    '& label': {
      textTransform: 'uppercase',
      letterSpacing: '3px',
      fontSize: '11px',
      position: 'absolute',
      top: '-13px',
    },
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
  const map = useSelector(mapSelector);

  return (
    <div className={styles.button}>
      <CenterFocusWeak fontSize="small" />
      <div className={styles.selectContainer}>
        <SimpleBoundaryDropdown
          className={styles.formControl}
          labelMessage={t('Go To')}
          map={map}
          selectedBoundaries={[]}
        />
      </div>
    </div>
  );
};

export default GoToBoundaryDropdown;
