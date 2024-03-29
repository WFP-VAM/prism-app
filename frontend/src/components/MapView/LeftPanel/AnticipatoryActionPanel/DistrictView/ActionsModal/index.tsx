import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import { Cancel, Close } from '@material-ui/icons';
import { useSafeTranslation } from 'i18n';
import React from 'react';
import { black, cyanBlue } from 'muiTheme';
import { AActions } from './actions';

interface ActionsModalProps {
  open: boolean;
  onClose: () => void;
}

function ActionsModal({ open, onClose }: ActionsModalProps) {
  const { t } = useSafeTranslation();
  const classes = useStyles();

  return (
    <Dialog open={open}>
      <DialogTitle>
        <div className={classes.titleWrapper}>
          <Typography variant="h2">{t('Actions undertaken')}</Typography>
          <IconButton style={{ padding: 0 }} onClick={() => onClose()}>
            <Cancel />
          </IconButton>
        </div>
      </DialogTitle>
      <DialogContent dividers>
        <div className={classes.contentWrapper}>
          {Object.entries(AActions).map(([action, data]) => (
            <div key={action} className={classes.actionRow}>
              <div className={classes.actionIconWrapper}>{data.icon}</div>
              <Typography variant="h3">{data.name}</Typography>
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
