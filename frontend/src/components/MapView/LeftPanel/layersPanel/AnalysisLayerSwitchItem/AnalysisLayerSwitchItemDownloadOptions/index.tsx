import React, { memo, useMemo, useCallback, useState } from 'react';
import { IconButton, Menu, MenuItem, Tooltip } from '@material-ui/core';
import GetAppIcon from '@material-ui/icons/GetApp';
import { useSafeTranslation } from 'i18n';
import { downloadToFile } from 'components/MapView/utils';
import {
  BaselineLayerResult,
  downloadCSVFromTableData,
  ExposedPopulationResult,
  generateAnalysisFilename,
  PolygonAnalysisResult,
  useAnalysisTableColumns,
} from 'utils/analysis-utils';

const AnalysisLayerSwitchItemDownloadOptions = memo(
  ({
    selected,
    analysisData,
    analysisResultSortByKey,
    analysisResultSortOrder,
  }: AnalysisLayerSwitchItemDownloadOptionsProps) => {
    const [
      downloadMenuAnchorEl,
      setDownloadMenuAnchorEl,
    ] = useState<HTMLElement | null>(null);

    const { translatedColumns } = useAnalysisTableColumns(analysisData);

    const { t } = useSafeTranslation();

    const featureCollection = useMemo(() => {
      return analysisData?.featureCollection;
    }, [analysisData]);

    const doesLayerAcceptCSVDownload = useMemo(() => {
      return (
        analysisData &&
        (analysisData instanceof BaselineLayerResult ||
          analysisData instanceof PolygonAnalysisResult)
      );
    }, [analysisData]);

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
        <Tooltip title="Download">
          <IconButton onClick={handleDownloadMenuOpen}>
            <GetAppIcon />
          </IconButton>
        </Tooltip>
      );
    }, [handleDownloadMenuOpen, selected]);

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
      if (
        // Explicit condition for type narrowing
        !analysisData ||
        analysisData instanceof ExposedPopulationResult
      ) {
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
      analysisResultSortByKey,
      analysisResultSortOrder,
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

    const renderedDownloadAsCSVMenuItem = useMemo(() => {
      if (!doesLayerAcceptCSVDownload) {
        return null;
      }
      return (
        <MenuItem key="download-as-csv" onClick={handleDownloadCsv}>
          {t('Download as CSV')}
        </MenuItem>
      );
    }, [doesLayerAcceptCSVDownload, handleDownloadCsv, t]);

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
