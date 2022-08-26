import {
  Button,
  createStyles,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Theme,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { jsPDF } from 'jspdf';
import React from 'react';
import { useSafeTranslation } from '../../../i18n';

function DownloadImage({
  classes,
  open,
  setOpen,
  previewRef,
  handleClose,
}: DownloadImageProps) {
  const { t } = useSafeTranslation();

  const download = (format: string) => {
    const ext = format === 'pdf' ? 'png' : format;
    const canvas = previewRef.current;
    if (canvas) {
      const file = canvas.toDataURL(`image/${ext}`);
      if (format === 'pdf') {
        // eslint-disable-next-line new-cap
        const pdf = new jsPDF({
          orientation: 'landscape',
        });
        const imgProps = pdf.getImageProperties(file);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(file, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('map.pdf');
      } else {
        const link = document.createElement('a');
        link.setAttribute('href', file);
        link.setAttribute('download', `map.${ext}`);
        link.click();
      }
      setOpen(false);
      handleClose();
    }
  };

  return (
    <Dialog
      maxWidth="xl"
      open={open}
      keepMounted
      onClose={() => setOpen(false)}
      aria-labelledby="dialog-preview"
    >
      <DialogTitle className={classes.title} id="dialog-preview">
        {t('Map Preview')}
      </DialogTitle>
      <DialogContent>
        <canvas ref={previewRef} />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)} color="primary">
          {t('Cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={() => download('png')}
          color="primary"
        >
          {t('Download PNG')}
        </Button>
        <Button
          variant="contained"
          onClick={() => download('jpeg')}
          color="primary"
        >
          {t('Download JPEG')}
        </Button>
        <Button
          variant="contained"
          onClick={() => download('pdf')}
          color="primary"
        >
          {t('Download PDF')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    title: {
      color: theme.palette.text.secondary,
    },
  });

export interface DownloadImageProps extends WithStyles<typeof styles> {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  previewRef: React.RefObject<HTMLCanvasElement>;
  handleClose: () => void;
}

export default withStyles(styles)(DownloadImage);
