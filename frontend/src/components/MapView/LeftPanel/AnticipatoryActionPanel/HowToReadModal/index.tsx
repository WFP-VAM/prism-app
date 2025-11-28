import {Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography} from '@mui/material';
import { Cancel, Close, HelpOutline } from '@mui/icons-material';
import { makeStyles, createStyles } from '@mui/styles';
import { useSafeTranslation } from 'i18n';
import { black, cyanBlue } from 'muiTheme';
import { getAADroughtCountryConfig } from '../AnticipatoryActionDroughtPanel/utils/countryConfig';

const content = getAADroughtCountryConfig().howToReadContent;

interface HowToReadModalProps {
  open: boolean;
  onClose: () => void;
}

function HowToReadModal({ open, onClose }: HowToReadModalProps) {
  const { t } = useSafeTranslation();
  const classes = useStyles();

  return (
    <Dialog open={open}>
      <DialogTitle>
        <div className={classes.titleWrapper}>
          <Typography variant="h2">{t('How to read this screen')}</Typography>
          <IconButton style={{ padding: 0 }} onClick={() => onClose()}>
            <Cancel />
          </IconButton>
        </div>
      </DialogTitle>
      <DialogContent dividers>
        <div className={classes.contentWrapper}>
          {content.map(x => (
            <div className={classes.contentItem} key={x.title.toLowerCase()}>
              <Typography variant="h3" style={{ fontWeight: 'bold' }}>
                {t(x.title)}
              </Typography>{' '}
              <Typography variant="h3">{t(x.text)}</Typography>{' '}
            </div>
          ))}
        </div>
      </DialogContent>
      <DialogActions className={classes.dialogActionsWrapper}>
        <Button
          component="a"
          href="mailto:anticipatory_action@wfp.org"
          target="_blank"
          className={classes.dialogButton}
          variant="outlined"
          startIcon={<HelpOutline />}
        >
          <Typography>{t('I STILL NEED HELP')}</Typography>
        </Button>
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
    contentWrapper: { display: 'flex', flexDirection: 'column', gap: '2rem' },
    contentItem: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    dialogActionsWrapper: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '1rem',
    },
    dialogButton: { borderColor: cyanBlue, color: black },
  }),
);

export default HowToReadModal;
