import React, { memo, useMemo, useCallback, useState } from 'react';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import GetAppIcon from '@mui/icons-material/GetApp';
import { useSafeTranslation } from 'i18n';
import {
  downloadToFile,
  getExposureAnalysisColumnsToRender,
  getExposureAnalysisTableData,
  getExposureAnalysisTableDataRowsToRender,
} from 'components/MapView/utils';
import {
  BaselineLayerResult,
  downloadCSVFromTableData,
  ExposedPopulationResult,
  generateAnalysisFilename,
  PolygonAnalysisResult,
  useAnalysisTableColumns,
} from 'utils/analysis-utils';
import { snakeCase } from 'lodash';
import { useSelector } from 'react-redux';
import {
  exposureAnalysisResultSortByKeySelector,
  exposureAnalysisResultSortOrderSelector,
  getCurrentDefinition,
  TableRow,
} from 'context/analysisResultStateSlice';
import { getExposureAnalysisCsvData } from 'utils/csv-utils';

const AnalysisLayerSwitchItemDownloadOptions = memo(
  ({
    selected,
    analysisData,
    analysisResultSortByKey,
    analysisResultSortOrder,
  }: AnalysisLayerSwitchItemDownloadOptionsProps) => {
    const [downloadMenuAnchorEl, setDownloadMenuAnchorEl] =
      useState<HTMLElement | null>(null);

    const { translatedColumns } = useAnalysisTableColumns(analysisData);

    const exposureAnalysisResultSortByKey = useSelector(
      exposureAnalysisResultSortByKeySelector,
    );
    const exposureAnalysisResultSortOrder = useSelector(
      exposureAnalysisResultSortOrderSelector,
    );
    const analysisDefinition = useSelector(getCurrentDefinition);

    const exposureAnalysisTableData = getExposureAnalysisTableData(
      (analysisData?.tableData || []) as TableRow[],
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
      () => analysisData?.featureCollection,
      [analysisData],
    );

    const handleDownloadMenuClose = useCallback(() => {
      setDownloadMenuAnchorEl(null);
    }, []);

    const handleDownloadMenuOpen = useCallback(
      (event: React.MouseEvent<HTMLElement>) => {
        setDownloadMenuAnchorEl(event.currentTarget);
      },
      [],
    );

    const renderedDownloadButton = useMemo(() => {
      if (!selected) {
        return (
          <IconButton disabled={!selected} onClick={handleDownloadMenuOpen}>
            <GetAppIcon />
          </IconButton>
        );
      }
      return (
        <Tooltip title={t('Download') as string}>
          <IconButton onClick={handleDownloadMenuOpen}>
            <GetAppIcon />
          </IconButton>
        </Tooltip>
      );
    }, [handleDownloadMenuOpen, selected, t]);

    const analysisDate = useMemo(() => {
      if (analysisData instanceof BaselineLayerResult) {
        return analysisData.analysisDate;
      }
      if (analysisData instanceof PolygonAnalysisResult) {
        return analysisData.endDate;
      }
      return null;
    }, [analysisData]);

    const fileName = useMemo(() => {
      if (
        // Explicit condition for type narrowing
        !analysisData ||
        analysisData instanceof ExposedPopulationResult
      ) {
        return analysisData?.getTitle(t);
      }
      return generateAnalysisFilename(analysisData, analysisDate ?? null);
    }, [analysisData, analysisDate, t]);

    const handleDownloadCsv = useCallback((): void => {
      if (!analysisData) {
        return;
      }
      if (analysisData instanceof ExposedPopulationResult) {
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
        analysisData,
        translatedColumns,
        analysisDate ?? null,
        analysisResultSortByKey,
        analysisResultSortOrder,
      );
    }, [
      analysisData,
      analysisDate,
      analysisDefinition,
      analysisResultSortByKey,
      analysisResultSortOrder,
      exposureAnalysisColumnsToRender,
      exposureAnalysisTableRowsToRender,
      translatedColumns,
    ]);

    const handleDownloadGeoJson = useCallback(() => {
      if (!analysisData) {
        return;
      }
      downloadToFile(
        {
          content: JSON.stringify(featureCollection),
          isUrl: false,
        },
        fileName ?? 'prism_extract',
        'application/json',
      );
    }, [analysisData, featureCollection, fileName]);

    const renderedDownloadAsCSVMenuItem = useMemo(
      () => (
        <MenuItem key="download-as-csv" onClick={handleDownloadCsv}>
          {t('Download as CSV')}
        </MenuItem>
      ),
      [handleDownloadCsv, t],
    );

    return (
      <>
        {renderedDownloadButton}
        <Menu
          id="download-menu"
          anchorEl={downloadMenuAnchorEl}
          keepMounted
          open={Boolean(downloadMenuAnchorEl)}
          onClose={handleDownloadMenuClose}
        >
          {[
            renderedDownloadAsCSVMenuItem,
            <MenuItem key="download-as-geojson" onClick={handleDownloadGeoJson}>
              {t('Download as GeoJSON')}
            </MenuItem>,
          ]}
        </Menu>
      </>
    );
  },
);

interface AnalysisLayerSwitchItemDownloadOptionsProps {
  selected: boolean;
  analysisData?:
    | BaselineLayerResult
    | PolygonAnalysisResult
    | ExposedPopulationResult;
  analysisResultSortByKey: string | number;
  analysisResultSortOrder: 'asc' | 'desc';
}

export default AnalysisLayerSwitchItemDownloadOptions;
