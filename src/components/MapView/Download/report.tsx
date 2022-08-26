import React from 'react';
import {
  Button,
  createStyles,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { jsPDF } from 'jspdf';
import { Page, Document, pdfjs } from 'react-pdf';
import { useSafeTranslation } from '../../../i18n';

// eslint-disable-next-line fp/no-mutation
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

function Report({
  // eslint-disable-next-line no-unused-vars
  classes,
  open,
  setOpen,
  // eslint-disable-next-line no-unused-vars
  previewRef,
  handleClose,
}: ReportProps) {
  const { t } = useSafeTranslation();
  const [preview, setPreview] = React.useState<any>();

  function blobToBase64(blob: Blob): Promise<string> {
    // eslint-disable-next-line no-unused-vars
    return new Promise((resolve: (value: string) => void, _) => {
      const reader = new FileReader();
      // eslint-disable-next-line fp/no-mutation
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  async function updatePreview(blobPDF: any) {
    const result = await blobToBase64(blobPDF);
    setPreview(result);
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

  React.useEffect(() => {
    // eslint-disable-next-line new-cap
    const pdf = new jsPDF();

    pdf.text('Hello world!', 10, 10);

    const blobPDF = new Blob([pdf.output('blob')], { type: 'application/pdf' });
    updatePreview(blobPDF);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Dialog
      open={open}
      keepMounted
      onClose={() => setOpen(false)}
      maxWidth={false}
    >
      <DialogTitle>{t('Report Title')}</DialogTitle>
      <DialogContent>
        <div>
          <Document file={preview}>
            <Page pageNumber={1} onLoadSuccess={removeTextLayerOffset} />
          </Document>
        </div>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setOpen(false);
            handleClose();
          }}
          color="primary"
        >
          {t('Cancel')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const styles = () => createStyles({});

export interface ReportProps extends WithStyles<typeof styles> {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  previewRef: React.RefObject<HTMLCanvasElement>;
  handleClose: () => void;
}

export default withStyles(styles)(Report);
