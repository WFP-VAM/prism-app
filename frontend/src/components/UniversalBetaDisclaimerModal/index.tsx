import {
  createStyles,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  makeStyles,
  Typography,
} from '@material-ui/core';
import { Cancel } from '@material-ui/icons';
import { useSafeTranslation } from 'i18n';
import { useCallback, useState } from 'react';
import { isUniversalDeployment } from 'utils/universal-utils';
import {
  isUniversalBetaDisclaimerDismissed,
  markUniversalBetaDisclaimerDismissed,
} from 'utils/universalBetaDisclaimer';

const backdropStyle = { backgroundColor: 'rgba(204, 204, 204, 0.6)' };

function UniversalBetaDisclaimerModal() {
  const { t } = useSafeTranslation();
  const classes = useStyles();
  const [open, setOpen] = useState(() => !isUniversalBetaDisclaimerDismissed());

  const handleClose = useCallback(() => {
    markUniversalBetaDisclaimerDismissed();
    setOpen(false);
  }, []);

  if (!isUniversalDeployment()) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      BackdropProps={{ style: backdropStyle }}
    >
      <DialogTitle>
        <div className={classes.titleWrapper}>
          <Typography variant="h2">{t('Beta notice')}</Typography>
          <IconButton style={{ padding: 0 }} onClick={handleClose}>
            <Cancel />
          </IconButton>
        </div>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body1">
          {t(
            'This deployment is currently in beta. Administrative boundaries and their names may not be accurate. Please report any inaccuracies to the Prism team.',
          )}
        </Typography>
      </DialogContent>
    </Dialog>
  );
}

const useStyles = makeStyles(() =>
  createStyles({
    titleWrapper: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'nowrap',
      justifyContent: 'space-between',
    },
  }),
);

export default UniversalBetaDisclaimerModal;
