import { ArrowBack } from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Theme,
  Typography,
  useTheme,
} from '@mui/material';
import type { SxProps } from '@mui/material/styles';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import LoadingBlinkingDots from 'components/Common/LoadingBlinkingDots';
import { ReportType } from 'config/types';
import {
  analysisResultSelector,
  TableRow as AnalysisTableRow,
} from 'context/analysisResultStateSlice';
import { mapSelector } from 'context/mapStateSlice/selectors';
import { useSafeTranslation } from 'i18n';
import { snakeCase } from 'lodash';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Column, ExposedPopulationResult } from 'utils/analysis-utils';
import { getFormattedDate } from 'utils/date-utils';
import { DateFormat } from 'utils/name-utils';

import ReportDoc from './reportDoc';

type Format = 'png' | 'jpeg';

const documentLoadingContainerSx = {
  zIndex: 1000,
  backgroundColor: 'white',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '100%',
} satisfies SxProps<Theme>;

const documentLoaderTextSx = {
  color: 'black',
} satisfies SxProps<Theme>;

const titleRootSx = (theme: Theme): SxProps<Theme> => ({
  background: theme.dialog?.border,
  padding: 0,
});

const titleSx = {
  display: 'flex',
  flexWrap: 'nowrap',
  alignItems: 'center',
} satisfies SxProps<Theme>;

const titleTextSx = {
  flexGrow: 1,
  textAlign: 'center',
  fontSize: 18,
} satisfies SxProps<Theme>;

const titleIconButtonSx = {
  color: '#FFFFFF',
} satisfies SxProps<Theme>;

const actionsSx = (theme: Theme): SxProps<Theme> => ({
  background: theme.dialog?.border,
  display: 'flex',
  justifyContent: 'space-between',
  flexDirection: 'row',
});

const signatureSx = {
  fontSize: 12,
  fontWeight: 500,
  paddingLeft: '1em',
} satisfies SxProps<Theme>;

const ReportDialog = memo(
  ({ open, reportConfig, handleClose, tableData, columns }: ReportProps) => {
    const theme = useTheme();
    const { t } = useSafeTranslation();
    const [mapImage, setMapImage] = useState<string | null>(null);
    const [documentIsLoading, setDocumentIsLoading] = useState(true);
    const selectedMap = useSelector(mapSelector);
    const analysisResult = useSelector(
      analysisResultSelector,
    ) as ExposedPopulationResult;

    const reportDate = useMemo(
      () =>
        analysisResult?.analysisDate
          ? getFormattedDate(
              new Date(analysisResult?.analysisDate).toISOString(),
              'default',
            )
          : '',
      [analysisResult],
    );

    const getPDFName = useMemo(() => {
      const type = snakeCase(analysisResult?.legendText);
      const date = new Date();
      const dateString = getFormattedDate(
        date.toISOString(),
        DateFormat.DayFirstSnakeCase,
      );
      return `PRISM_report_${type}_${dateString}.pdf`;
    }, [analysisResult]);

    const getMapImage = useCallback(
      (format: Format = 'png'): string | null => {
        if (selectedMap) {
          const activeLayers = selectedMap.getCanvas();
          return activeLayers.toDataURL(`image/${format}`);
        }
        return null;
      },
      [selectedMap],
    );

    useEffect(() => {
      if (!open) {
        return;
      }
      setMapImage(getMapImage('png'));
    }, [getMapImage, open, selectedMap]);

    const renderedPdfViewer = useMemo(() => {
      if (!mapImage) {
        return null;
      }
      return (
        <div style={{ width: '100%', height: '100%' }}>
          <PDFViewer
            style={{ width: '100%', height: '100%' }}
            showToolbar={false}
          >
            <ReportDoc
              exposureLegendDefinition={analysisResult?.legend ?? []}
              theme={theme}
              tableShowTotal
              reportTitle={`${t(reportConfig.title)} ${reportDate}`}
              reportConfig={reportConfig}
              mapImage={mapImage}
              tableData={tableData}
              columns={columns}
            />
          </PDFViewer>
        </div>
      );
    }, [
      analysisResult,
      columns,
      mapImage,
      reportConfig,
      reportDate,
      t,
      tableData,
      theme,
    ]);

    const renderedLoadingButtonText: any = useCallback(
      ({ loading }: any) => {
        if (loading) {
          setDocumentIsLoading(true);
          return `${t('Loading document')}...`;
        }
        setDocumentIsLoading(false);
        return t('Download');
      },
      [t],
    );

    const renderedDownloadPdfButton = useMemo(() => {
      if (!mapImage) {
        return null;
      }
      return (
        <Button id="download-action">
          <PDFDownloadLink
            document={
              <ReportDoc
                exposureLegendDefinition={analysisResult?.legend ?? []}
                theme={theme}
                reportTitle={`${t(reportConfig.title)} ${reportDate}`}
                reportConfig={reportConfig}
                tableShowTotal
                mapImage={mapImage}
                tableData={tableData}
                columns={columns}
              />
            }
            fileName={getPDFName}
          >
            {renderedLoadingButtonText}
          </PDFDownloadLink>
        </Button>
      );
    }, [
      analysisResult,
      columns,
      getPDFName,
      mapImage,
      renderedLoadingButtonText,
      reportConfig,
      reportDate,
      t,
      tableData,
      theme,
    ]);

    const renderedSignatureText = useMemo(
      () =>
        reportConfig?.signatureText
          ? t(reportConfig.signatureText)
          : t('PRISM automated report'),
      [reportConfig, t],
    );

    return (
      <Dialog
        keepMounted
        open={open}
        onClose={() => handleClose()}
        maxWidth={false}
      >
        <DialogTitle sx={titleRootSx(theme)}>
          <Box sx={titleSx}>
            <IconButton
              sx={titleIconButtonSx}
              onClick={() => {
                handleClose();
              }}
              size="large"
            >
              <ArrowBack />
            </IconButton>
            <Box component="span" sx={titleTextSx}>
              {t(reportConfig.title)}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent
          style={{
            height: '90vh',
            width: 'calc(90vh / 1.42)',
            position: 'relative',
          }}
        >
          {documentIsLoading && (
            <Box sx={documentLoadingContainerSx}>
              <Typography
                sx={documentLoaderTextSx}
                variant="body1"
                component="span"
              >
                {t('Loading document')}
              </Typography>
              <LoadingBlinkingDots dotColor="white" />
            </Box>
          )}
          {renderedPdfViewer}
        </DialogContent>
        <DialogActions sx={actionsSx(theme)}>
          <Box component="span" sx={signatureSx}>
            {renderedSignatureText}
          </Box>
          {renderedDownloadPdfButton}
        </DialogActions>
      </Dialog>
    );
  },
);

export interface ReportProps {
  open: boolean;
  reportConfig: ReportType;
  handleClose: () => void;
  tableData: AnalysisTableRow[];
  columns: Column[];
}

export default ReportDialog;
