import {
  Box,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
} from '@material-ui/core';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import { mapValues } from 'lodash';
import BarChartIcon from '@material-ui/icons/BarChart';
import GetAppIcon from '@material-ui/icons/GetApp';
import {
  AdminLevelDataLayerProps,
  AggregationOperations,
  ExposedPopulationDefinition,
  GeometryType,
  LayerType,
  WMSLayerProps,
} from '../../../../../../config/types';
import {
  dateRangeSelector,
  layerDataSelector,
} from '../../../../../../context/mapStateSlice/selectors';
import { LayerData } from '../../../../../../context/layers/layer-data';
import { downloadToFile } from '../../../../utils';
import {
  DEFAULT_DATE_FORMAT,
  DEFAULT_DATE_FORMAT_SNAKE_CASE,
} from '../../../../../../utils/name-utils';
import { castObjectsArrayToCsv } from '../../../../../../utils/csv-utils';
import { downloadGeotiff, Extent } from '../../../../Layers/raster-utils';
import { useSafeTranslation } from '../../../../../../i18n';
import {
  analysisResultSelector,
  clearAnalysisResult,
  ExposedPopulationDispatchParams,
  isExposureAnalysisLoadingSelector,
  requestAndStoreExposedPopulation,
  setCurrentDataDefinition,
} from '../../../../../../context/analysisResultStateSlice';
import { setTabValue } from '../../../../../../context/leftPanelStateSlice';
import { TableKey } from '../../../../../../config/utils';

function LayerDownloadOptions({
  layer,
  extent,
  selected,
  exposure,
}: LayerDownloadOptionsProps) {
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();
  const analysisResult = useSelector(analysisResultSelector);

  const [
    downloadMenuAnchorEl,
    setDownloadMenuAnchorEl,
  ] = useState<HTMLElement | null>(null);
  const [isGeotiffLoading, setIsGeotiffLoading] = useState(false);
  const isAnalysisExposureLoading = useSelector(
    isExposureAnalysisLoadingSelector,
  );

  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const adminLevelLayerData = useSelector(
    layerDataSelector(layer.id, selectedDate),
  ) as LayerData<AdminLevelDataLayerProps>;

  const handleDownloadMenuClose = () => {
    setDownloadMenuAnchorEl(null);
  };

  const handleDownloadMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setDownloadMenuAnchorEl(event.currentTarget);
  };

  // Since the exposure analysis doesn't have predefined table in configurations
  // and need to have a `TableKey` will use this util function to handle such case
  // used timestamp to avoid any potential rare name collision
  const generateUniqueTableKey = (activityName: string) => {
    return `${activityName}_${Date.now()}`;
  };

  const getFilename = (): string => {
    const safeTitle = layer.title ?? layer.id;
    if (selectedDate && (layer as AdminLevelDataLayerProps).dates) {
      const dateString = moment(selectedDate).format(
        DEFAULT_DATE_FORMAT_SNAKE_CASE,
      );
      return `${safeTitle}_${dateString}`;
    }
    return safeTitle;
  };

  const handleDownloadGeoJson = (): void => {
    downloadToFile(
      {
        content: JSON.stringify(adminLevelLayerData.data.features),
        isUrl: false,
      },
      getFilename(),
      'application/json',
    );
    handleDownloadMenuClose();
  };

  const handleDownloadCsv = (): void => {
    const translatedColumnsNames = mapValues(
      adminLevelLayerData.data.layerData[0],
      (v, k) => (k === 'value' ? t(adminLevelLayerData.layer.id) : t(k)),
    );
    downloadToFile(
      {
        content: castObjectsArrayToCsv(
          adminLevelLayerData.data.layerData,
          translatedColumnsNames,
          ';',
        ),
        isUrl: false,
      },
      getFilename(),
      'text/csv',
    );
    handleDownloadMenuClose();
  };

  const handleDownloadGeoTiff = (): void => {
    setIsGeotiffLoading(true);
    downloadGeotiff(
      (layer as WMSLayerProps).serverLayerName,
      extent,
      moment(selectedDate).format(DEFAULT_DATE_FORMAT),
      dispatch,
      () => setIsGeotiffLoading(false),
    );
    handleDownloadMenuClose();
  };

  const handleExposureAnalysis = () => {
    if (analysisResult) {
      dispatch(clearAnalysisResult());
    }

    if (!layer.id || !extent || !exposure) {
      return;
    }

    if (!selectedDate) {
      throw new Error('Date must be given to run analysis');
    }

    const hazardLayer =
      layer.type === 'wms' && layer.geometry === GeometryType.Polygon
        ? { wfsLayerId: layer.id }
        : { maskLayerId: layer.id };

    const params: ExposedPopulationDispatchParams = {
      exposure,
      date: selectedDate,
      statistic: AggregationOperations.Sum,
      extent,
      ...hazardLayer,
    };

    dispatch(requestAndStoreExposedPopulation(params));
    dispatch(
      setCurrentDataDefinition({
        id: generateUniqueTableKey('exposure_analysis') as TableKey,
        title: analysisResult?.getTitle(t) || '',
        table: '',
        legendText: t(analysisResult?.legendText || ''),
      }),
    );
    handleDownloadMenuClose();
    dispatch(setTabValue(2));
  };

  const shouldShowDownloadButton =
    layer.type === 'admin_level_data' ||
    (layer.type === 'wms' &&
      layer.baseUrl.includes('api.earthobservation.vam.wfp.org/ows'));

  return (
    <>
      {exposure && (
        <Tooltip title={t('Exposure Analysis') ?? ''}>
          <IconButton disabled={!selected} onClick={handleExposureAnalysis}>
            <BarChartIcon />
          </IconButton>
        </Tooltip>
      )}

      {shouldShowDownloadButton && (
        <Tooltip title="Download">
          <IconButton
            disabled={!selected || isGeotiffLoading}
            onClick={handleDownloadMenuOpen}
          >
            <GetAppIcon />
          </IconButton>
        </Tooltip>
      )}
      {isGeotiffLoading ||
        (isAnalysisExposureLoading && (
          <Box display="flex" alignItems="center">
            <CircularProgress size="20px" />
          </Box>
        ))}
      <Menu
        id="download-menu"
        anchorEl={downloadMenuAnchorEl}
        keepMounted
        open={Boolean(downloadMenuAnchorEl)}
        onClose={handleDownloadMenuClose}
      >
        {layer.type === 'admin_level_data' && [
          <MenuItem onClick={handleDownloadCsv}>
            {t('Download as CSV')}
          </MenuItem>,
          <MenuItem onClick={handleDownloadGeoJson}>
            {t('Download as GeoJSON')}
          </MenuItem>,
        ]}
        {layer.type === 'wms' &&
          layer.baseUrl.includes('api.earthobservation.vam.wfp.org/ows') && (
            <MenuItem onClick={handleDownloadGeoTiff}>
              {t('Download as GeoTIFF')}
            </MenuItem>
          )}
      </Menu>
    </>
  );
}

interface LayerDownloadOptionsProps {
  layer: LayerType;
  extent: Extent | undefined;
  selected: boolean;
  exposure: ExposedPopulationDefinition | undefined;
}

export default LayerDownloadOptions;
