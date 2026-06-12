import { Cancel, Close, HelpOutlined } from '@mui/icons-material';
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

import { howToReadModalSx } from '../aaPanelStyles';
import { getAADroughtCountryConfig } from '../AnticipatoryActionDroughtPanel/utils/countryConfig';

const content = getAADroughtCountryConfig().howToReadContent;

interface HowToReadModalProps {
  open: boolean;
  onClose: () => void;
}

function HowToReadModal({ open, onClose }: HowToReadModalProps) {
  const { t } = useSafeTranslation();

  return (
    <Dialog open={open}>
      <DialogTitle>
        <Box sx={howToReadModalSx.titleWrapper}>
          <Typography variant="h2">{t('How to read this screen')}</Typography>
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
        <Box sx={howToReadModalSx.contentWrapper}>
          {content.map(x => (
            <Box sx={howToReadModalSx.contentItem} key={x.title.toLowerCase()}>
              <Typography variant="h3" style={{ fontWeight: 'bold' }}>
                {t(x.title)}
              </Typography>{' '}
              <Typography variant="h3">{t(x.text)}</Typography>{' '}
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={howToReadModalSx.dialogActionsWrapper}>
        <Button
          component="a"
          href="mailto:anticipatory_action@wfp.org"
          target="_blank"
          sx={howToReadModalSx.dialogButton}
          variant="outlined"
          startIcon={<HelpOutlined />}
        >
          <Typography>{t('I STILL NEED HELP')}</Typography>
        </Button>
        <Button
          sx={howToReadModalSx.dialogButton}
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

export default HowToReadModal;
