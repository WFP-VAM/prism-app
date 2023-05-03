import React, { memo, useMemo, useCallback, useState } from 'react';
import { IconButton, Menu, MenuItem, Tooltip } from '@material-ui/core';
import GetAppIcon from '@material-ui/icons/GetApp';
import { useSafeTranslation } from '../../../../../../i18n';
import { downloadToFile } from '../../../../utils';
import {
  BaselineLayerResult,
  downloadCSVFromTableData,
  generateAnalysisFilename,
  PolygonAnalysisResult,
  useAnalysisTableColumns,
} from '../../../../../../utils/analysis-utils';

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
      return analysisData?.endDate;
    }, [analysisData]);

    const fileName = useMemo(() => {
      if (!analysisData) {
        return '';
      }
      return generateAnalysisFilename(analysisData, analysisDate ?? null);
    }, [analysisData, analysisDate]);

    const handleDownloadCsv = useCallback((): void => {
      if (!analysisData) {
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
            <MenuItem key="download-as-csv" onClick={handleDownloadCsv}>
              {t('Download as CSV')}
            </MenuItem>,
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
  analysisData?: BaselineLayerResult | PolygonAnalysisResult;
  analysisResultSortByKey: string | number;
  analysisResultSortOrder: 'asc' | 'desc';
}

export default AnalysisLayerSwitchItemDownloadOptions;
