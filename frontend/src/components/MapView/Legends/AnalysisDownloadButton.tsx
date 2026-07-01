import GetAppIcon from '@mui/icons-material/GetApp';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import { usePostHog } from '@posthog/react';
import {
  downloadToFile,
  getExposureAnalysisColumnsToRender,
  getExposureAnalysisTableData,
  getExposureAnalysisTableDataRowsToRender,
} from 'components/MapView/utils';
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
import { snakeCase } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  BaselineLayerResult,
  downloadCSVFromTableData,
  ExposedPopulationResult,
  generateAnalysisFilename,
  PolygonAnalysisResult,
  useAnalysisTableColumns,
} from 'utils/analysis-utils';
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

  const posthog = usePostHog();
  const [downloadMenuAnchorEl, setDownloadMenuAnchorEl] =
    useState<HTMLElement | null>(null);

  const handleDownloadMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setDownloadMenuAnchorEl(event.currentTarget);
  };

  const handleDownloadMenuClose = () => {
    setDownloadMenuAnchorEl(null);
  };

  const exposureAnalysisTableData = getExposureAnalysisTableData(
    (analysisResult?.tableData || []) as TableRow[],
    exposureAnalysisResultSortByKey,
    exposureAnalysisResultSortOrder,
  );
  const exposureAnalysisColumnsToRender =
    getExposureAnalysisColumnsToRender(translatedColumns);
  const exposureAnalysisTableRowsToRender =
    getExposureAnalysisTableDataRowsToRender(
      translatedColumns,
      exposureAnalysisTableData,
    );

  const { t } = useSafeTranslation();

  const featureCollection = useMemo(
    () => analysisResult?.featureCollection,
    [analysisResult],
  );

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
    posthog?.capture('analysis_downloaded_geojson', {
      file_name: fileName ?? 'prism_extract',
    });
    downloadToFile(
      {
        content: JSON.stringify(featureCollection),
        isUrl: false,
      },
      fileName ?? 'prism_extract',
      'application/json',
    );
    handleDownloadMenuClose();
  }, [featureCollection, fileName, posthog]);

  const handleAnalysisDownloadCsv = useCallback((): void => {
    handleDownloadMenuClose();
    if (!analysisResult) {
      return;
    }
    posthog?.capture('analysis_downloaded_csv', {
      analysis_type: analysisResult.constructor.name,
    });
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
    posthog,
    translatedColumns,
  ]);

  return (
    <>
      <Tooltip title={t('Download') as string}>
        <IconButton onClick={handleDownloadMenuOpen} size="small">
          <GetAppIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        id="download-menu"
        anchorEl={downloadMenuAnchorEl}
        keepMounted
        open={Boolean(downloadMenuAnchorEl)}
        onClose={handleDownloadMenuClose}
      >
        <MenuItem key="download-as-csv" onClick={handleAnalysisDownloadCsv}>
          {t('Download as CSV')}
        </MenuItem>
        <MenuItem
          key="download-as-geojson"
          onClick={handleAnalysisDownloadGeoJson}
        >
          {t('Download as GeoJSON')}
        </MenuItem>
      </Menu>
    </>
  );
}

export default AnalysisDownloadButton;
