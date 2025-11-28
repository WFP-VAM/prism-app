import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import { Cancel, Close } from '@mui/icons-material';
import { makeStyles, createStyles } from '@mui/styles';
import { useSafeTranslation } from 'i18n';
import { black, cyanBlue } from 'muiTheme';
import { Action } from './actions';

interface ActionsModalProps {
  actions: Action[];
  open: boolean;
  onClose: () => void;
}

function ActionsModal({ open, onClose, actions }: ActionsModalProps) {
  const { t } = useSafeTranslation();
  const classes = useStyles();

  return (
    <Dialog open={open}>
      <DialogTitle>
        <div className={classes.titleWrapper}>
          <Typography variant="h2">{t('Recommended actions')}</Typography>
          <IconButton style={{ padding: 0 }} onClick={() => onClose()}>
            <Cancel />
          </IconButton>
        </div>
      </DialogTitle>
      <DialogContent dividers>
        <div className={classes.contentWrapper}>
          {actions.map(action => (
            <div key={action.name} className={classes.actionRow}>
              <div className={classes.actionIconWrapper}>{action.icon}</div>
              <Typography variant="h3">{t(action.name)}</Typography>
            </div>
          ))}
        </div>
      </DialogContent>
      <DialogActions className={classes.dialogActionsWrapper}>
        <Button
          className={classes.dialogButton}
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

const useStyles = makeStyles(() =>
  createStyles({
    titleWrapper: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'nowrap',
      justifyContent: 'space-between',
    },
    contentWrapper: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    actionRow: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'nowrap',
      gap: '1rem',
      color: 'black',
    },
    actionIconWrapper: { width: '2rem' },
    dialogActionsWrapper: { display: 'flex', justifyContent: 'center' },
    dialogButton: { borderColor: cyanBlue, color: black },
  }),
);

export default ActionsModal;
