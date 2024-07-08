import { useCallback, useState, MouseEvent, useMemo } from 'react';
import { Button, Typography } from '@material-ui/core';
import { snakeCase } from 'lodash';
import { useSelector } from 'react-redux';
import {
  downloadToFile,
  getExposureAnalysisColumnsToRender,
  getExposureAnalysisTableDataRowsToRender,
} from 'components/MapView/utils';
import { useSafeTranslation } from 'i18n';
import {
  exposureLayerIdSelector,
  getCurrentDefinition,
  TableRow as AnalysisTableRow,
} from 'context/analysisResultStateSlice';
import ReportDialog from 'components/Common/ReportDialog';
import { Column } from 'utils/analysis-utils';
import { ReportsDefinitions } from 'config/utils';
import { getExposureAnalysisCsvData } from 'utils/csv-utils';
import LoadingBlinkingDots from '../../../../Common/LoadingBlinkingDots';
import { safeCountry } from '../../../../../config';

function ExposureAnalysisActions({
  analysisButton,
  bottomButton,
  clearAnalysis,
  tableData,
  columns,
}: ExposureAnalysisActionsProps) {
  // only display local names if local language is selected, otherwise display english name
  const { t, i18n } = useSafeTranslation();
  const analysisDefinition = useSelector(getCurrentDefinition);
  const exposureLayerId = useSelector(exposureLayerIdSelector);

  const [openReport, setOpenReport] = useState(false);
  const [downloadReportIsLoading, setDownloadReportIsLoading] = useState(false);

  const API_URL = 'https://prism-api.ovio.org/report';

  const exposureAnalysisColumnsToRender =
    getExposureAnalysisColumnsToRender(columns);
  const exposureAnalysisTableRowsToRender =
    getExposureAnalysisTableDataRowsToRender(columns, tableData);
  const exposureAnalysisCsvData = getExposureAnalysisCsvData(
    exposureAnalysisColumnsToRender,
    exposureAnalysisTableRowsToRender,
  );

  const reportConfig = useMemo(() => {
    // We use find here because exposure reports and layers have 1 - 1 sync.
    // TODO Future enhancement if exposure reports are more than one for specific layer
    const foundReportKeyBasedOnLayerId = Object.keys(ReportsDefinitions).find(
      reportDefinitionKey =>
        ReportsDefinitions[reportDefinitionKey].layerId === exposureLayerId,
    );
    return ReportsDefinitions[foundReportKeyBasedOnLayerId as string];
  }, [exposureLayerId]);

  const handleOnDownloadCsv = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      downloadToFile(
        {
          content: exposureAnalysisCsvData,
          isUrl: false,
        },
        `${snakeCase(analysisDefinition?.id)}_${snakeCase(
          analysisDefinition?.legendText,
        )}`,
        'text/csv',
      );
    },
    [analysisDefinition, exposureAnalysisCsvData],
  );

  /**
   * Trigger a report generation on the backend API and dowload it
   *  */
  const handleDownloadReport = async () => {
    setDownloadReportIsLoading(true);
    try {
      const response = await fetch(
        `${API_URL}?url=${encodeURIComponent(window.location.href)}&language=${
          i18n.language
        }&exposureLayerId=${exposureLayerId}&country=${safeCountry}`,
      );
      const blob = await response.blob();
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(new Blob([blob]));

      // Create a link element
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        window.location.href
          .split('?hazardLayerIds=')[1]
          .split('&date=')
          .join('-')
          .concat('.pdf'),
      );

      // Append the link to the document body and click it to initiate download
      document.body.appendChild(link);
      link.click();

      // Clean up the temporary URL and link element
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setDownloadReportIsLoading(false);
    }
    setDownloadReportIsLoading(false);
  };

  const handleToggleReport = (toggle: boolean) => () => {
    setOpenReport(toggle);
  };

  return (
    <>
      <Button className={analysisButton} onClick={clearAnalysis}>
        <Typography variant="body2">{t('Clear Analysis')}</Typography>
      </Button>
      {exposureAnalysisCsvData && (
        <Button className={bottomButton} onClick={handleOnDownloadCsv}>
          <Typography variant="body2">{t('Download as CSV')}</Typography>
        </Button>
      )}
      {reportConfig && (
        <Button
          id="create-report"
          className={bottomButton}
          onClick={handleToggleReport(true)}
          // TOTO - Hide the preview report button for now. Report creation happens in the backend and is cached.
          style={{
            position: 'absolute',
            height: 0,
            width: 0,
            minWidth: 0,
            padding: 0,
            margin: 0,
          }}
        >
          <Typography variant="body2">{t('Preview Report (slow)')}</Typography>
        </Button>
      )}
      <Button
        className={bottomButton}
        onClick={handleDownloadReport}
        disabled={downloadReportIsLoading}
      >
        <Typography variant="body2">{t('Download Report')}</Typography>
        {downloadReportIsLoading && <LoadingBlinkingDots dotColor="white" />}
      </Button>
      {/* TODO: */}
      <ReportDialog
        open={openReport}
        handleClose={handleToggleReport(false)}
        reportConfig={reportConfig}
        tableData={tableData}
        columns={columns}
      />
    </>
  );
}

interface ExposureAnalysisActionsProps {
  analysisButton?: string;
  bottomButton?: string;
  clearAnalysis: () => void;
  tableData: AnalysisTableRow[];
  columns: Column[];
}

export default ExposureAnalysisActions;
