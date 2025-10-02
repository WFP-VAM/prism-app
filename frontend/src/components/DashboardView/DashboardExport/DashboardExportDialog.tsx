import {
  Dialog,
  DialogContent,
  Snackbar,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import mask from '@turf/mask';
import { getFormattedDate } from 'utils/date-utils';
import { dashboardTitleSelector } from 'context/dashboardStateSlice';
import { downloadToFile } from 'components/MapView/utils';
import { AdminCodeString } from 'config/types';
import { getBoundaryLayerSingleton } from 'config/utils';
import { safeCountry } from 'config';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import DashboardExportContext, {
  PaperSize,
  ExportToggles,
} from './dashboardExport.context';
import DashboardExportPreview from './DashboardExportPreview';
import DashboardExportConfig from './DashboardExportConfig';

const boundaryLayer = getBoundaryLayerSingleton();

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

  // Map display toggles and options
  const [toggles, setToggles] = useState<ExportToggles>({
    logoVisibility: true,
    mapLabelsVisibility: true,
    adminAreasVisibility: false,
    legendVisibility: true,
  });
  const [logoPosition, setLogoPosition] = useState(0);
  const [logoScale, setLogoScale] = useState(1);
  const [legendPosition, setLegendPosition] = useState(0);
  const [legendScale, setLegendScale] = useState(0);
  const [selectedBoundaries, setSelectedBoundaries] = useState<
    AdminCodeString[]
  >([]);

  const [invertedAdminBoundaryLimitPolygon, setAdminBoundaryPolygon] =
    useState(null);

  // Get boundary layer data from Redux
  const layerData = useSelector(layerDataSelector);
  const data = (layerData as any)?.[boundaryLayer.id]?.data;

  // Create the admin boundary mask when boundaries are selected
  useEffect(() => {
    if (!toggles.adminAreasVisibility) {
      setAdminBoundaryPolygon(null);
      return;
    }

    // admin-boundary-unified-polygon.json is generated using "yarn preprocess-layers"
    if (selectedBoundaries.length === 0) {
      fetch(`data/${safeCountry}/admin-boundary-unified-polygon.json`)
        .then(response => response.json())
        .then(polygonData => {
          const maskedPolygon = mask(polygonData as any);
          setAdminBoundaryPolygon(maskedPolygon as any);
        })
        .catch(error =>
          console.error('Error loading admin boundary polygon:', error),
        );
      return;
    }

    if (!data) {
      return;
    }

    const filteredData = {
      ...data,
      features: data.features.filter((cell: any) =>
        selectedBoundaries.includes(cell.properties?.[boundaryLayer.adminCode]),
      ),
    };
    const masked = mask(filteredData as any);
    setAdminBoundaryPolygon(masked as any);
  }, [data, selectedBoundaries, toggles.adminAreasVisibility]);

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
        scale: 2, // Higher quality capture
        useCORS: true,
        logging: false,
        backgroundColor: '#F8F8F8',
        width: elem.offsetWidth,
        height: elem.offsetHeight,
      });

      // Convert canvas to appropriate format
      if (format === 'pdf') {
        // Determine PDF page size based on paper size selection
        // eslint-disable-next-line fp/no-let
        let pdfFormat: [number, number] | string;
        if (paperSize === PaperSize.US_LETTER_LANDSCAPE) {
          pdfFormat = 'letter'; // eslint-disable-line fp/no-mutation
        } else if (paperSize === PaperSize.A4_LANDSCAPE) {
          pdfFormat = 'a4'; // eslint-disable-line fp/no-mutation
        } else {
          // Browser mode - use canvas dimensions converted to points (96 DPI to 72 DPI)
          const widthInPoints = (canvas.width * 72) / 96 / 2; // Divide by 2 because scale=2
          const heightInPoints = (canvas.height * 72) / 96 / 2;
          pdfFormat = [widthInPoints, heightInPoints]; // eslint-disable-line fp/no-mutation
        }

        // eslint-disable-next-line new-cap
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'pt',
          format: pdfFormat,
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Calculate image dimensions to maintain aspect ratio
        const canvasAspectRatio = canvas.width / canvas.height;
        const pdfAspectRatio = pdfWidth / pdfHeight;

        // If canvas is wider than PDF page, fit to width
        // If canvas is taller than PDF page, fit to height
        const imgWidth =
          canvasAspectRatio > pdfAspectRatio
            ? pdfWidth
            : pdfHeight * canvasAspectRatio;
        const imgHeight =
          canvasAspectRatio > pdfAspectRatio
            ? pdfWidth / canvasAspectRatio
            : pdfHeight;

        // Center the image on the page
        const xOffset = (pdfWidth - imgWidth) / 2;
        const yOffset = (pdfHeight - imgHeight) / 2;

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(
          imgData,
          'PNG',
          xOffset,
          yOffset,
          imgWidth,
          imgHeight,
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
      toggles,
      setToggles,
      logoPosition,
      setLogoPosition,
      logoScale,
      setLogoScale,
      legendPosition,
      setLegendPosition,
      legendScale,
      setLegendScale,
      selectedBoundaries,
      setSelectedBoundaries,
      invertedAdminBoundaryLimitPolygon,
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
