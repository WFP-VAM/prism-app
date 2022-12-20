import React from 'react';
import { useSelector } from 'react-redux';
import { analysisResultSelector } from '../../../context/analysisResultStateSlice';
import { useSafeTranslation } from '../../../i18n';
import {
  BaselineLayerResult,
  downloadCSVFromTableData,
  generateAnalysisFilename,
  PolygonAnalysisResult,
  useAnalysisTableColumns,
} from '../../../utils/analysis-utils';
import MultiOptionsButton from '../../Common/MultiOptionsButton';
import { downloadToFile } from '../utils';

function AnalysisDownloadButton() {
  const analysisResult = useSelector(analysisResultSelector);
  const featureCollection = analysisResult?.featureCollection;
  const { translatedColumns } = useAnalysisTableColumns(analysisResult);

  const { t } = useSafeTranslation();

  const doesLayerAcceptCSVDownload =
    analysisResult &&
    (analysisResult instanceof BaselineLayerResult ||
      analysisResult instanceof PolygonAnalysisResult);

  const getAnalysisDate = () => {
    if (analysisResult instanceof BaselineLayerResult) {
      return analysisResult.analysisDate;
    }
    if (analysisResult instanceof PolygonAnalysisResult) {
      return analysisResult.endDate;
    }
    return null;
  };

  const handleAnalysisDownloadGeoJson = (): void => {
    const getFilename = () => {
      if (
        // Explicit condition for type narrowing
        analysisResult &&
        (analysisResult instanceof BaselineLayerResult ||
          analysisResult instanceof PolygonAnalysisResult)
      ) {
        return generateAnalysisFilename(
          analysisResult,
          getAnalysisDate() ?? null,
        );
      }
      return analysisResult?.getTitle();
    };

    downloadToFile(
      {
        content: JSON.stringify(featureCollection),
        isUrl: false,
      },
      getFilename() ?? 'prism_extract',
      'application/json',
    );
  };

  const handleAnalysisDownloadCsv = (): void => {
    if (
      // Explicit condition for type narrowing
      analysisResult &&
      (analysisResult instanceof BaselineLayerResult ||
        analysisResult instanceof PolygonAnalysisResult)
    ) {
      downloadCSVFromTableData(
        analysisResult,
        translatedColumns,
        getAnalysisDate() ?? null,
      );
    }
  };

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
