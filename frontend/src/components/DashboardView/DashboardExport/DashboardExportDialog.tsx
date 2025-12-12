import {
  Dialog,
  DialogContent,
  Snackbar,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import mask from '@turf/mask';
import { useSafeTranslation } from 'i18n';
import { getFormattedDate } from 'utils/date-utils';
import {
  dashboardConfigSelector,
  dashboardMapStateSelector,
  dashboardColumnsSelector,
} from 'context/dashboardStateSlice';
import { downloadToFile } from 'components/MapView/utils';
import { AdminCodeString, DashboardElementType } from 'config/types';
import { getBoundaryLayerSingleton } from 'config/utils';
import { safeCountry } from 'config';
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
  const { t } = useSafeTranslation();
  const printRef = useRef<HTMLDivElement>(null);
  const [paperSize, setPaperSize] = useState<PaperSize>(PaperSize.A4_LANDSCAPE);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [downloadMenuAnchorEl, setDownloadMenuAnchorEl] =
    useState<HTMLElement | null>(null);
  const dashboardConfig = useSelector(dashboardConfigSelector);
  const { title: dashboardTitle } = dashboardConfig;
  const columns = useSelector(dashboardColumnsSelector);

  // Find the first map element to get initial legend settings
  const getFirstMapElementId = (): string | null => {
    const columnIndex = columns.findIndex(column =>
      column.some(element => element.type === DashboardElementType.MAP),
    );

    if (columnIndex === -1) {
      return null;
    }

    const elementIndex = columns[columnIndex].findIndex(
      element => element.type === DashboardElementType.MAP,
    );

    return `${columnIndex}-${elementIndex}`;
  };

  const firstMapState = useSelector(
    dashboardMapStateSelector(getFirstMapElementId() || ''),
  );

  // Map display toggles and options - initialize from first map's state
  const [toggles, setToggles] = useState<ExportToggles>({
    logoVisibility: true,
    mapLabelsVisibility: true,
    adminAreasVisibility: false,
    legendVisibility: true,
  });
  const [logoPosition, setLogoPosition] = useState(0);
  const [logoScale, setLogoScale] = useState(1);
  const [legendPosition, setLegendPosition] = useState(1);
  const [legendScale, setLegendScale] = useState(0);
  const [selectedBoundaries, setSelectedBoundaries] = useState<
    AdminCodeString[]
  >([]);

  // Wrapper for setSelectedBoundaries to match SimpleBoundaryDropdown's expected signature
  const handleSetSelectedBoundaries = (
    boundaries: AdminCodeString[],
    _appendMany?: boolean,
  ) => {
    setSelectedBoundaries(boundaries);
  };

  const [invertedAdminBoundaryLimitPolygon, setAdminBoundaryPolygon] =
    useState(null);
  const [boundaryData, setBoundaryData] = useState<any>(null);

  // Update export config when dialog opens to sync with current map state
  useEffect(() => {
    if (open && firstMapState) {
      setToggles(prev => ({
        ...prev,
        legendVisibility: firstMapState.legendVisible ?? true,
      }));
      setLegendPosition(firstMapState.legendPosition === 'left' ? 0 : 1);
    }
  }, [open, firstMapState]);

  // Load boundary layer data directly
  useEffect(() => {
    if (open && !boundaryData) {
      fetch(boundaryLayer.path)
        .then(response => response.json())
        .then(data => {
          setBoundaryData(data);
        })
        .catch(error => console.error('Error loading boundary data:', error));
    }
  }, [open, boundaryData]);

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

    // Wait for boundary data to be loaded
    if (!boundaryData) {
      return;
    }

    // Filter features - this handles cases where parent regions are selected (e.g., selecting a province includes all its districts)
    const filteredData = {
      ...boundaryData,
      features: boundaryData.features.filter((cell: any) => {
        const featureAdminCode = cell.properties?.[boundaryLayer.adminCode];
        return selectedBoundaries.some(selectedCode =>
          String(featureAdminCode).startsWith(selectedCode),
        );
      }),
    };

    if (filteredData.features.length === 0) {
      // Fall back to full country mask if no features match
      fetch(`data/${safeCountry}/admin-boundary-unified-polygon.json`)
        .then(response => response.json())
        .then(polygonData => {
          const maskedPolygon = mask(polygonData as any);
          setAdminBoundaryPolygon(maskedPolygon as any);
        });
      return;
    }

    const masked = mask(filteredData as any);
    setAdminBoundaryPolygon(masked as any);
  }, [boundaryData, selectedBoundaries, toggles.adminAreasVisibility]);

  const handleDownloadMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setDownloadMenuAnchorEl(event.currentTarget);
  };

  const handleDownloadMenuClose = () => {
    setDownloadMenuAnchorEl(null);
  };

  const download = async (format: 'pdf' | 'png') => {
    handleDownloadMenuClose();
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
        // Always use A4 landscape format

        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'pt',
          format: 'a4',
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
        t(`Dashboard exported successfully as ${format.toUpperCase()}`),
      );

      // Close dialog after successful export
      setTimeout(() => {
        handleClose();
      }, 500);
    } catch (error) {
      setErrorMessage(
        `${t('Failed to export dashboard')}. ${
          error instanceof Error ? error.message : t('Unknown error')
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

  const exportContext = {
    exportConfig: {
      handleClose,
      download,
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
      setSelectedBoundaries: handleSetSelectedBoundaries,
      invertedAdminBoundaryLimitPolygon,
      handleDownloadMenuOpen,
      handleDownloadMenuClose,
      downloadMenuAnchorEl,
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
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
  }),
);

export default DashboardExportDialog;
