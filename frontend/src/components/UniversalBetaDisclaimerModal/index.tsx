import { Cancel } from '@mui/icons-material';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Typography,
} from '@mui/material';
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
      slotProps={{ backdrop: { style: backdropStyle } }}
    >
      <DialogTitle>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'nowrap',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h2">{t('Beta notice')}</Typography>
          <IconButton style={{ padding: 0 }} onClick={handleClose}>
            <Cancel />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body1">
          {t(
            'This deployment is currently in beta. Administrative boundaries and their names may not be accurate. Please report any inaccuracies to the Prism team at',
          )}{' '}
          <Link href="mailto:wfp.prism@wfp.org">wfp.prism@wfp.org</Link>.
        </Typography>
      </DialogContent>
    </Dialog>
  );
}

export default UniversalBetaDisclaimerModal;
