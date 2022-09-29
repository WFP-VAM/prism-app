import {
  Button,
  CircularProgress,
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
import { downloadToFile } from '../utils';

function DownloadImage({
  classes,
  open,
  previewRef,
  handleClose,
}: DownloadImageProps) {
  const { t } = useSafeTranslation();
  const [downloading, setDownloading] = React.useState<boolean>(false);

  const download = async (format: 'pdf' | 'jpeg' | 'png') => {
    const docGeneration = new Promise<void>((resolve, reject) => {
      // png is generally preferred for images containing lines and text.
      const ext = format === 'pdf' ? 'png' : format;
      const canvas = previewRef.current;
      if (!canvas) {
        reject(new Error('canvas is undefined'));
        // return statement to make compiler happy about canvas possibly being undefined
        return;
      }
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
        downloadToFile({ content: file, isUrl: true }, 'map', `image/${ext}`);
      }
      resolve();
    });

    setDownloading(true);
    try {
      await docGeneration;
    } catch (error) {
      console.error(error);
    } finally {
      setDownloading(false);
    }

    handleClose();
  };

  return (
    <Dialog
      maxWidth="xl"
      open={open}
      keepMounted
      onClose={() => handleClose()}
      aria-labelledby="dialog-preview"
    >
      <DialogTitle className={classes.title} id="dialog-preview">
        {t('Map Preview')}
      </DialogTitle>
      <DialogContent>
        <canvas ref={previewRef} />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => handleClose()} color="primary">
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
          {downloading ? (
            <CircularProgress color="secondary" />
          ) : (
            t('Download PDF')
          )}
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
  previewRef: React.RefObject<HTMLCanvasElement>;
  handleClose: () => void;
}

export default withStyles(styles)(DownloadImage);
