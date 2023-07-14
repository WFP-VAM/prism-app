import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  analysisResultSelector,
  analysisResultSortByKeySelector,
  analysisResultSortOrderSelector,
  exposureAnalysisResultSortByKeySelector,
  exposureAnalysisResultSortOrderSelector,
  getCurrentDefinition,
  TableRow,
} from 'context/analysisResultStateSlice';
import { useSafeTranslation } from 'i18n';
import {
  BaselineLayerResult,
  downloadCSVFromTableData,
  ExposedPopulationResult,
  generateAnalysisFilename,
  PolygonAnalysisResult,
  useAnalysisTableColumns,
} from 'utils/analysis-utils';
import MultiOptionsButton from 'components/Common/MultiOptionsButton';
import {
  downloadToFile,
  getExposureAnalysisColumnsToRender,
  getExposureAnalysisTableData,
  getExposureAnalysisTableDataRowsToRender,
} from 'components/MapView/utils';
import { snakeCase } from 'lodash';
import { getExposureAnalysisCsvData } from 'utils/csv-utils';

function AnalysisDownloadButton() {
  const analysisResult = useSelector(analysisResultSelector);
  const analysisResultSortByKey = useSelector(analysisResultSortByKeySelector);
  const analysisResultSortOrder = useSelector(analysisResultSortOrderSelector);
  const { translatedColumns } = useAnalysisTableColumns(analysisResult);

  const exposureAnalysisResultSortByKey = useSelector(
    exposureAnalysisResultSortByKeySelector,
  );
  const exposureAnalysisResultSortOrder = useSelector(
    exposureAnalysisResultSortOrderSelector,
  );
  const analysisDefinition = useSelector(getCurrentDefinition);

  const exposureAnalysisTableData = getExposureAnalysisTableData(
    analysisResult?.tableData as TableRow[],
    exposureAnalysisResultSortByKey,
    exposureAnalysisResultSortOrder,
  );
  const exposureAnalysisColumnsToRender = getExposureAnalysisColumnsToRender(
    translatedColumns,
  );
  const exposureAnalysisTableRowsToRender = getExposureAnalysisTableDataRowsToRender(
    translatedColumns,
    exposureAnalysisTableData,
  );

  const { t } = useSafeTranslation();

  const featureCollection = useMemo(() => {
    return analysisResult?.featureCollection;
  }, [analysisResult]);

  const analysisDate = useMemo(() => {
    if (analysisResult instanceof BaselineLayerResult) {
      return analysisResult.analysisDate;
    }
    if (analysisResult instanceof PolygonAnalysisResult) {
      return analysisResult.endDate;
    }
    return null;
  }, [analysisResult]);

  const fileName = useMemo(() => {
    if (
      // Explicit condition for type narrowing
      !analysisResult ||
      analysisResult instanceof ExposedPopulationResult
    ) {
      return analysisResult?.getTitle(t);
    }
    return generateAnalysisFilename(analysisResult, analysisDate ?? null);
  }, [analysisDate, analysisResult, t]);

  const handleAnalysisDownloadGeoJson = useCallback((): void => {
    downloadToFile(
      {
        content: JSON.stringify(featureCollection),
        isUrl: false,
      },
      fileName ?? 'prism_extract',
      'application/json',
    );
  }, [featureCollection, fileName]);

  const handleAnalysisDownloadCsv = useCallback((): void => {
    if (!analysisResult) {
      return;
    }
    if (analysisResult instanceof ExposedPopulationResult) {
      downloadToFile(
        {
          content: getExposureAnalysisCsvData(
            exposureAnalysisColumnsToRender,
            exposureAnalysisTableRowsToRender,
          ),
          isUrl: false,
        },
        `${snakeCase(analysisDefinition?.id)}_${snakeCase(
          analysisDefinition?.legendText,
        )}`,
        'text/csv',
      );
      return;
    }
    downloadCSVFromTableData(
      analysisResult,
      translatedColumns,
      analysisDate ?? null,
      analysisResultSortByKey,
      analysisResultSortOrder,
    );
  }, [
    analysisDate,
    analysisDefinition,
    analysisResult,
    analysisResultSortByKey,
    analysisResultSortOrder,
    exposureAnalysisColumnsToRender,
    exposureAnalysisTableRowsToRender,
    translatedColumns,
  ]);

  return (
    <MultiOptionsButton
      mainLabel={t('Download')}
      options={[
        {
          label: 'GEOJSON',
          onClick: handleAnalysisDownloadGeoJson,
        },
        {
          label: 'CSV',
          onClick: handleAnalysisDownloadCsv,
        },
      ]}
    />
  );
}

export default AnalysisDownloadButton;
