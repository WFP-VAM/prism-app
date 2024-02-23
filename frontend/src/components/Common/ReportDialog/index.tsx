import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  createStyles,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Theme,
  Typography,
  useTheme,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { useSelector } from 'react-redux';
import { ArrowBack } from '@material-ui/icons';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { snakeCase } from 'lodash';
import moment from 'moment';
import { useSafeTranslation } from 'i18n';
import { mapSelector } from 'context/mapStateSlice/selectors';
import {
  analysisResultSelector,
  TableRow as AnalysisTableRow,
} from 'context/analysisResultStateSlice';
import { Column, ExposedPopulationResult } from 'utils/analysis-utils';
import LoadingBlinkingDots from 'components/Common/LoadingBlinkingDots';
import { ReportType } from 'config/types';
import { getDateFormat } from 'utils/date-utils';
import ReportDoc from './reportDoc';

type Format = 'png' | 'jpeg';

const ReportDialog = memo(
  ({
    classes,
    open,
    reportConfig,
    handleClose,
    tableData,
    columns,
  }: ReportProps) => {
    const theme = useTheme();
    const { t } = useSafeTranslation();
    const [mapImage, setMapImage] = useState<string | null>(null);
    const [documentIsLoading, setDocumentIsLoading] = useState(true);
    const selectedMap = useSelector(mapSelector);
    const analysisResult = useSelector(
      analysisResultSelector,
    ) as ExposedPopulationResult;

    const reportDate = useMemo(() => {
      return analysisResult?.date
        ? getDateFormat(new Date(analysisResult?.date).toISOString(), 'default')
        : '';
    }, [analysisResult]);

    const getPDFName = useMemo(() => {
      const type = snakeCase(analysisResult?.legendText);
      const date = new Date();
      const dateString = moment(date).format('DD_MM_YYYY');
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

    // Manual loader wait to show that the document is loading
    useEffect(() => {
      const loadingTimer = setTimeout(() => {
        setDocumentIsLoading(false);
      }, 15000);
      if (!open) {
        return clearTimeout(loadingTimer);
      }
      return () => clearTimeout(loadingTimer);
    }, [open]);

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

    const renderedPdfDocumentLoading = useMemo(() => {
      if (!documentIsLoading) {
        return null;
      }
      return (
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
      );
    }, [
      classes.documentLoaderText,
      classes.documentLoadingContainer,
      documentIsLoading,
      t,
    ]);

    const renderedLoadingButtonText = useCallback(
      ({ loading }) => {
        if (loading || documentIsLoading) {
          return `${t('Loading document')}...`;
        }
        return t('Download');
      },
      [documentIsLoading, t],
    );

    const renderedDownloadPdfButton = useMemo(() => {
      if (!mapImage) {
        return null;
      }
      return (
        <>
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
        </>
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

    const renderedSignatureText = useMemo(() => {
      return reportConfig?.signatureText
        ? t(reportConfig.signatureText)
        : t('PRISM automated report');
    }, [reportConfig, t]);

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
          {renderedPdfDocumentLoading}
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

const styles = (theme: Theme) =>
  createStyles({
    documentLoadingContainer: {
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
  });

export interface ReportProps extends WithStyles<typeof styles> {
  open: boolean;
  reportConfig: ReportType;
  handleClose: () => void;
  tableData: AnalysisTableRow[];
  columns: Column[];
}

export default withStyles(styles)(ReportDialog);
