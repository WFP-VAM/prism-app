import {
  Dialog,
  DialogContent,
  Snackbar,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getFormattedDate } from 'utils/date-utils';
import { dashboardTitleSelector } from 'context/dashboardStateSlice';
import { downloadToFile } from 'components/MapView/utils';
import DashboardExportContext, { PaperSize } from './dashboardExport.context';
import DashboardExportPreview from './DashboardExportPreview';
import DashboardExportConfig from './DashboardExportConfig';

interface DashboardExportDialogProps {
  open: boolean;
  handleClose: () => void;
}

function DashboardExportDialog({
  open,
  handleClose,
}: DashboardExportDialogProps) {
  const classes = useStyles();
  const printRef = useRef<HTMLDivElement>(null);
  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'png'>('pdf');
  const [paperSize, setPaperSize] = useState<PaperSize>(PaperSize.BROWSER);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const dashboardTitle = useSelector(dashboardTitleSelector);

  const download = async (format: 'pdf' | 'png') => {
    setIsExporting(true);

    try {
      const filename = `${dashboardTitle || 'Dashboard'}_${
        getFormattedDate(Date.now(), 'snake') || 'export'
      }`;

      const elem = printRef.current;
      if (!elem) {
        throw new Error('Export element not found');
      }

      // Capture the dashboard as a canvas
      // Wait a moment for any pending renders to complete
      await new Promise(resolve => {
        setTimeout(resolve, 100);
      });

      const canvas = await html2canvas(elem, {
        scale: 1, // Capture at actual displayed size
        useCORS: true,
        logging: false,
        backgroundColor: '#F8F8F8',
        width: elem.offsetWidth,
        height: elem.offsetHeight,
      });

      // Convert canvas to appropriate format
      if (format === 'pdf') {
        const orientation = 'landscape';

        // TODO: Adapt orientation, maybe to canvas dimensions?
        // const orientation =
        //   canvas.width > canvas.height ? 'landscape' : 'portrait';

        // Create PDF with canvas dimensions
        // eslint-disable-next-line new-cap
        const pdf = new jsPDF({
          orientation,
          unit: 'px',
          format: [canvas.width, canvas.height],
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(
          imgData,
          'PNG',
          0,
          0,
          pdfWidth,
          pdfHeight,
          undefined,
          'FAST',
        );

        pdf.save(`${filename}.pdf`);
      } else {
        // PNG export
        const imgData = canvas.toDataURL('image/png');
        downloadToFile(
          { content: imgData, isUrl: true },
          filename,
          'image/png',
        );
      }

      setSuccessMessage(
        `Dashboard exported successfully as ${format.toUpperCase()}`,
      );

      // Close dialog after successful export
      setTimeout(() => {
        handleClose();
      }, 500);
    } catch (error) {
      setErrorMessage(
        `Failed to export dashboard. ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleErrorClose = () => {
    setErrorMessage(null);
  };

  const handleSuccessClose = () => {
    setSuccessMessage(null);
  };

  // eslint-disable-next-line react/jsx-no-constructed-context-values
  const exportContext = {
    exportConfig: {
      handleClose,
      download,
      downloadFormat,
      setDownloadFormat,
      isExporting,
      printRef,
      paperSize,
      setPaperSize,
    },
  };

  return (
    <DashboardExportContext.Provider value={exportContext}>
      <Dialog
        maxWidth="xl"
        open={open}
        onClose={handleClose}
        aria-labelledby="dashboard-export-dialog"
      >
        <DialogContent className={classes.contentContainer}>
          <DashboardExportPreview />
          <DashboardExportConfig />
        </DialogContent>
      </Dialog>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={handleSuccessClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSuccessClose} severity="success">
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={handleErrorClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleErrorClose} severity="error">
          {errorMessage}
        </Alert>
      </Snackbar>
    </DashboardExportContext.Provider>
  );
}

const useStyles = makeStyles(() =>
  createStyles({
    contentContainer: {
      fontFamily: 'Roboto',
      scrollbarGutter: 'stable',
      display: 'flex',
      gap: '1rem',
      marginRight: '-15px',
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '90vw',
      height: '90vh',
    },
  }),
);

export default DashboardExportDialog;
