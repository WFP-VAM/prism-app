import React, { memo, useCallback, useEffect, useMemo } from 'react';
import {
  Button,
  createStyles,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Theme,
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
    const [mapImage, setMapImage] = React.useState<string | null>(null);
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
        <DialogContent style={{ height: '90vh', width: 'calc(90vh / 1.42)' }}>
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
              {({ loading }) => (loading ? 'Loading document...' : 'Download')}
            </PDFDownloadLink>
          </Button>
        </DialogActions>
      </Dialog>
    );
  },
);

const styles = (theme: Theme) =>
  createStyles({
    documentLoadingContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      width: '100%',
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
