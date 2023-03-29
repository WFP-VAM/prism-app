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
import { useSafeTranslation } from '../../../i18n';
import { mapSelector } from '../../../context/mapStateSlice/selectors';
import {
  analysisResultSelector,
  TableRow as AnalysisTableRow,
} from '../../../context/analysisResultStateSlice';
import { Column, ExposedPopulationResult } from '../../../utils/analysis-utils';
import ReportDoc from './reportDoc';
import { ReportType } from './types';

type Format = 'png' | 'jpeg';

const ReportDialog = memo(
  ({
    classes,
    open,
    reportType,
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

    const eventDate = useMemo(() => {
      return analysisResult?.date
        ? moment(new Date(analysisResult?.date)).format('YYYY-MM-DD')
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
      }, 20000);
      return () => clearTimeout(loadingTimer);
    }, []);

    useEffect(() => {
      if (!open) {
        return;
      }
      setMapImage(getMapImage('png'));
    }, [getMapImage, open, selectedMap]);

    const reportDoc = useMemo(() => {
      return (
        <ReportDoc
          t={t}
          exposureLegendDefinition={analysisResult?.legend ?? []}
          theme={theme}
          reportType={reportType}
          tableName="Population Exposure"
          tableShowTotal
          eventName={
            reportType === ReportType.Storm
              ? `Storm Report (${eventDate})`
              : `Flood Report (${eventDate})`
          }
          mapImage={mapImage}
          tableData={tableData}
          columns={columns}
        />
      );
    }, [
      analysisResult,
      columns,
      eventDate,
      mapImage,
      reportType,
      t,
      tableData,
      theme,
    ]);

    const renderedPdfLoadingProgressBar = useMemo(() => {
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
          <span className={classes.documentLoaderDot}>.</span>
          <span className={classes.documentLoaderDot}>.</span>
          <span className={classes.documentLoaderDot}>.</span>
        </Box>
      );
    }, [
      classes.documentLoaderDot,
      classes.documentLoaderText,
      classes.documentLoadingContainer,
      documentIsLoading,
      t,
    ]);

    // The report type text
    const reportTypeText = useMemo(() => {
      return reportType === ReportType.Storm
        ? 'Storm impact Report'
        : 'Flood Report';
    }, [reportType]);

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
            <span className={classes.titleText}>{t(reportTypeText)}</span>
          </div>
        </DialogTitle>
        <DialogContent
          style={{
            height: '90vh',
            width: 'calc(90vh / 1.42)',
            position: 'relative',
          }}
        >
          {renderedPdfLoadingProgressBar}
          <div style={{ width: '100%', height: '100%' }}>
            <PDFViewer
              style={{ width: '100%', height: '100%' }}
              showToolbar={false}
            >
              {reportDoc}
            </PDFViewer>
          </div>
        </DialogContent>
        <DialogActions className={classes.actions}>
          <span className={classes.signature}>
            {t('P R I S M automated report')}
          </span>
          <Button className={classes.actionButton} variant="outlined">
            <PDFDownloadLink document={reportDoc} fileName={getPDFName}>
              {({ loading }) =>
                loading || documentIsLoading
                  ? `${t('Loading document')}...`
                  : t('Download')
              }
            </PDFDownloadLink>
          </Button>
        </DialogActions>
      </Dialog>
    );
  },
);

const styles = (theme: Theme) =>
  createStyles({
    '@keyframes blink': {
      '50%': {
        color: 'transparent',
      },
    },
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
    documentLoaderDot: {
      color: 'black',
      animation: '1s $blink infinite',
      '&:nth-child(2)': {
        animationDelay: '250ms',
      },
      '&:nth-child(3)': {
        animationDelay: '500ms',
      },
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
  reportType: ReportType;
  handleClose: () => void;
  tableData: AnalysisTableRow[];
  columns: Column[];
}

export default withStyles(styles)(ReportDialog);
