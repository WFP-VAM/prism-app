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

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { makeStyles, createStyles } from '@mui/styles';
import { useSelector } from 'react-redux';
import { ArrowBack } from '@mui/icons-material';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { snakeCase } from 'lodash';
import { useSafeTranslation } from 'i18n';
import { mapSelector } from 'context/mapStateSlice/selectors';
import {
  analysisResultSelector,
  TableRow as AnalysisTableRow,
} from 'context/analysisResultStateSlice';
import { Column, ExposedPopulationResult } from 'utils/analysis-utils';
import LoadingBlinkingDots from 'components/Common/LoadingBlinkingDots';
import { ReportType } from 'config/types';
import { DateFormat } from 'utils/name-utils';
import { getFormattedDate } from 'utils/date-utils';
import ReportDoc from './reportDoc';

type Format = 'png' | 'jpeg';

const ReportDialog = memo(
  ({ open, reportConfig, handleClose, tableData, columns }: ReportProps) => {
    const classes = useStyles();
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
        <DialogTitle className={classes.titleRoot}>
          <div className={classes.title}>
            <IconButton
              className={classes.titleIconButton}
              onClick={() => {
                handleClose();
              }}
            >
              <ArrowBack />
            </IconButton>
            <span className={classes.titleText}>{t(reportConfig.title)}</span>
          </div>
        </DialogTitle>
        <DialogContent
          style={{
            height: '90vh',
            width: 'calc(90vh / 1.42)',
            position: 'relative',
          }}
        >
          {documentIsLoading && (
            <Box className={classes.documentLoadingContainer}>
              <Typography
                className={classes.documentLoaderText}
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
        <DialogActions className={classes.actions}>
          <span className={classes.signature}>{renderedSignatureText}</span>
          {renderedDownloadPdfButton}
        </DialogActions>
      </Dialog>
    );
  },
);

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    documentLoadingContainer: {
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
    },
    documentLoaderText: {
      color: 'black',
    },
    titleRoot: {
      background: theme.dialog?.border,
      padding: 0,
    },
    title: {
      display: 'flex',
      flexWrap: 'nowrap',
      alignItems: 'center',
    },
    titleText: {
      flexGrow: 1,
      textAlign: 'center',
      fontSize: 18,
    },
    titleIconButton: {
      color: '#FFFFFF',
    },
    actions: {
      background: theme.dialog?.border,
      display: 'flex',
      justifyContent: 'space-between',
      flexDirection: 'row',
    },
    actionButton: {
      background: '#FFFFFF',
      color: theme.dialog?.actionButton,
      fontSize: 12,
    },
    signature: {
      fontSize: 12,
      fontWeight: 500,
      paddingLeft: '1em',
    },
  }),
);

export interface ReportProps {
  open: boolean;
  reportConfig: ReportType;
  handleClose: () => void;
  tableData: AnalysisTableRow[];
  columns: Column[];
}

export default ReportDialog;
