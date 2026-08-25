import { Cancel, Close } from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import { useSafeTranslation } from 'i18n';

import { actionsModalSx } from '../../../aaPanelStyles';
import { Action } from './actions';

interface ActionsModalProps {
  actions: Action[];
  open: boolean;
  onClose: () => void;
}

function ActionsModal({ open, onClose, actions }: ActionsModalProps) {
  const { t } = useSafeTranslation();

  return (
    <Dialog open={open}>
      <DialogTitle>
        <Box sx={actionsModalSx.titleWrapper}>
          <Typography variant="h2">{t('Recommended actions')}</Typography>
          <IconButton
            style={{ padding: 0 }}
            onClick={() => onClose()}
            size="large"
          >
            <Cancel />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={actionsModalSx.contentWrapper}>
          {actions.map(action => (
            <Box key={action.name} sx={actionsModalSx.actionRow}>
              <Box sx={actionsModalSx.actionIconWrapper}>{action.icon}</Box>
              <Typography variant="h3">{t(action.name)}</Typography>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={actionsModalSx.dialogActionsWrapper}>
        <Button
          sx={actionsModalSx.dialogButton}
          variant="outlined"
          startIcon={<Close />}
          onClick={() => onClose()}
        >
          <Typography>{t('Close')}</Typography>
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ActionsModal;
