import React from 'react';
import {
  Button,
  createStyles,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { jsPDF } from 'jspdf';
import { Page, Document, pdfjs } from 'react-pdf';
import { useSelector } from 'react-redux';
import { ArrowBack } from '@material-ui/icons';
import { useSafeTranslation } from '../../../i18n';
import { mapSelector } from '../../../context/mapStateSlice/selectors';

// eslint-disable-next-line fp/no-mutation
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

function Report({ classes, open, setOpen, handleClose }: ReportProps) {
  const { t } = useSafeTranslation();
  const [preview, setPreview] = React.useState<any>();
  const selectedMap = useSelector(mapSelector);

  function blobToBase64(blob: Blob): Promise<string> {
    // eslint-disable-next-line no-unused-vars
    return new Promise((resolve: (value: string) => void, _) => {
      const reader = new FileReader();
      // eslint-disable-next-line fp/no-mutation
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  function removeTextLayerOffset() {
    const textLayers = document.querySelectorAll(
      '.react-pdf__Page__textContent',
    );
    textLayers.forEach(layer => {
      const { style } = layer as any;
      // eslint-disable-next-line fp/no-mutation
      style.top = '0';
      // eslint-disable-next-line fp/no-mutation
      style.left = '0';
      // eslint-disable-next-line fp/no-mutation
      style.transform = '';
    });
  }

  function getMapImage(format: 'png' | 'jpeg' = 'png'): string | null {
    if (selectedMap) {
      const activeLayers = selectedMap.getCanvas();
      const file = activeLayers.toDataURL(`image/${format}`);
      return file;
    }
    return null;
  }

  async function generatePdf() {
    // eslint-disable-next-line new-cap
    const pdf = new jsPDF();

    const file = getMapImage('png');

    pdf.text('Hello world!', 10, 10);

    if (file !== null) {
      const imgProps = pdf.getImageProperties(file);
      const pdfWidth = pdf.internal.pageSize.getWidth() - 20;
      const pdfHeight = imgProps.height * (pdfWidth / imgProps.width);
      pdf.addImage(file, 'PNG', 10, 15, pdfWidth, pdfHeight);
    }

    const blobPDF = new Blob([pdf.output('blob')], { type: 'application/pdf' });
    const result = await blobToBase64(blobPDF);
    setPreview(result);
  }

  React.useEffect(() => {
    if (open) {
      generatePdf();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedMap]);

  return (
    <Dialog
      open={open}
      keepMounted
      onClose={() => setOpen(false)}
      maxWidth={false}
    >
      <DialogTitle className={classes.titleRoot}>
        <div className={classes.title}>
          <IconButton
            className={classes.titleIconButton}
            onClick={() => {
              setOpen(false);
              handleClose();
            }}
          >
            <ArrowBack />
          </IconButton>

          <span className={classes.titleText}>{t('Report Title')}</span>
        </div>
      </DialogTitle>
      <DialogContent>
        <div>
          <Document file={preview} renderMode="svg">
            <Page pageNumber={1} onLoadSuccess={removeTextLayerOffset} />
          </Document>
        </div>
      </DialogContent>
      <DialogActions className={classes.actions}>
        <Button
          className={classes.actionButton}
          variant="outlined"
          onClick={() => generatePdf()}
          color="primary"
        >
          {t('Generate PDF')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const styles = () =>
  createStyles({
    titleRoot: {
      background: '#2E6EAF',
    },
    title: {
      display: 'flex',
      flexWrap: 'nowrap',
      alignItems: 'center',
    },
    titleText: {
      flexGrow: 1,
      textAlign: 'center',
    },
    titleIconButton: {
      color: '#FFFFFF',
    },
    actions: {
      background: '#2E6EAF',
    },
    actionButton: {
      background: '#FFFFFF',
    },
  });

export interface ReportProps extends WithStyles<typeof styles> {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleClose: () => void;
}

export default withStyles(styles)(Report);
