import { Typography, createStyles, makeStyles } from '@material-ui/core';
import React from 'react';
import { useSafeTranslation } from 'i18n';
import { PanelSize } from 'config/types';
import HowToReadModal from '../HowToReadModal';
import ActivationTrigger from './ActivationTriggerView';

function AnticipatoryActionStormPanel() {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const [howToReadModalOpen, setHowToReadModalOpen] = React.useState(false);

  return (
    <div
      className={classes.anticipatoryActionPanel}
      style={{ width: PanelSize.medium }}
    >
      <HowToReadModal
        open={howToReadModalOpen}
        onClose={() => setHowToReadModalOpen(false)}
      />
      <div className={classes.headerWrapper}>
        <div className={classes.titleSelectWrapper}>
          <div className={classes.titleSelectWrapper}>
            <Typography variant="h2">{t('STORM - Global view')}</Typography>
          </div>
        </div>
      </div>
      <ActivationTrigger dialogs={[]} />
    </div>
  );
}

const useStyles = makeStyles(() =>
  createStyles({
    anticipatoryActionPanel: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      height: '100%',
    },
    headerWrapper: {
      padding: '1rem 1rem 0 1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.50rem',
    },
    titleSelectWrapper: {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
    },
  }),
);

export default AnticipatoryActionStormPanel;
