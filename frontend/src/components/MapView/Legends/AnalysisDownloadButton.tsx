import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  analysisResultSelector,
  analysisResultSortByKeySelector,
  analysisResultSortOrderSelector,
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
import { downloadToFile } from 'components/MapView/utils';

function AnalysisDownloadButton() {
  const analysisResult = useSelector(analysisResultSelector);
  const analysisResultSortByKey = useSelector(analysisResultSortByKeySelector);
  const analysisResultSortOrder = useSelector(analysisResultSortOrderSelector);
  const { translatedColumns } = useAnalysisTableColumns(analysisResult);

  const { t } = useSafeTranslation();

  const featureCollection = useMemo(() => {
    return analysisResult?.featureCollection;
  }, [analysisResult]);

  const doesLayerAcceptCSVDownload = useMemo(() => {
    return (
      analysisResult &&
      (analysisResult instanceof BaselineLayerResult ||
        analysisResult instanceof PolygonAnalysisResult)
    );
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
    if (
      // Explicit condition for type narrowing
      !analysisResult ||
      analysisResult instanceof ExposedPopulationResult
    ) {
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
    analysisResult,
    analysisResultSortByKey,
    analysisResultSortOrder,
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
        ...(doesLayerAcceptCSVDownload
          ? [
              {
                label: 'CSV',
                onClick: handleAnalysisDownloadCsv,
              },
            ]
          : []),
      ]}
    />
  );
}

export default AnalysisDownloadButton;
