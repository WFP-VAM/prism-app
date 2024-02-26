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
import { mapValues } from 'lodash';
import GetAppIcon from '@material-ui/icons/GetApp';
import {
  AdminLevelDataLayerProps,
  LayerKey,
  WMSLayerProps,
} from 'config/types';
import {
  dateRangeSelector,
  layerDataSelector,
} from 'context/mapStateSlice/selectors';
import { LayerData } from 'context/layers/layer-data';
import { downloadToFile } from 'components/MapView/utils';
import { castObjectsArrayToCsv } from 'utils/csv-utils';
import {
  downloadGeotiff,
  Extent,
} from 'components/MapView/Layers/raster-utils';
import { useSafeTranslation } from 'i18n';
import { isExposureAnalysisLoadingSelector } from 'context/analysisResultStateSlice';
import { availableDatesSelector } from 'context/serverStateSlice';
import { getRequestDate } from 'utils/server-utils';
import { LayerDefinitions, getStacBand } from 'config/utils';
import { getDateFormat } from 'utils/date-utils';
import { safeCountry } from 'config';

// TODO - return early when the layer is not selected.
function LayerDownloadOptions({
  layerId,
  extent,
  selected,
  size,
}: LayerDownloadOptionsProps) {
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();
  const layer = LayerDefinitions[layerId] || Object.values(LayerDefinitions)[0];

  const [
    downloadMenuAnchorEl,
    setDownloadMenuAnchorEl,
  ] = useState<HTMLElement | null>(null);
  const [isGeotiffLoading, setIsGeotiffLoading] = useState(false);
  const isAnalysisExposureLoading = useSelector(
    isExposureAnalysisLoadingSelector,
  );

  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const serverAvailableDates = useSelector(availableDatesSelector);
  const layerAvailableDates = serverAvailableDates[layer.id];
  const queryDate = selected
    ? getRequestDate(layerAvailableDates, selectedDate)
    : undefined;

  const adminLevelLayerData = useSelector(
    layerDataSelector(layer.id, queryDate),
  ) as LayerData<AdminLevelDataLayerProps>;

  const handleDownloadMenuClose = () => {
    setDownloadMenuAnchorEl(null);
  };

  const handleDownloadMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setDownloadMenuAnchorEl(event.currentTarget);
  };

  const getFilename = (): string => {
    const safeTitle = layer.title ?? layer.id;
    if (selectedDate && (layer as AdminLevelDataLayerProps).dates) {
      const dateString = getDateFormat(selectedDate, 'snake');
      return `${safeTitle}_${dateString}`;
    }
    return safeTitle;
  };

  const handleDownloadGeoJson = (): void => {
    if (!adminLevelLayerData) {
      console.warn(`No layer data available for ${layer.id}`);
    }
    downloadToFile(
      {
        content: JSON.stringify(adminLevelLayerData?.data.features),
        isUrl: false,
      },
      getFilename(),
      'application/json',
    );
    handleDownloadMenuClose();
  };

  const handleDownloadCsv = (): void => {
    if (!adminLevelLayerData) {
      console.warn(`No layer data available for ${layer.id}`);
    }
    const translatedColumnsNames = mapValues(
      adminLevelLayerData?.data.layerData[0],
      (v, k) => (k === 'value' ? t(adminLevelLayerData.layer.id) : t(k)),
    );
    downloadToFile(
      {
        content: castObjectsArrayToCsv(
          adminLevelLayerData?.data.layerData,
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
    const { serverLayerName, additionalQueryParams } = layer as WMSLayerProps;
    const band = getStacBand(additionalQueryParams);
    const dateString = getDateFormat(selectedDate, 'default') as string;

    setIsGeotiffLoading(true);
    downloadGeotiff(
      serverLayerName,
      band,
      extent,
      dateString,
      `${safeCountry}_${layerId}_${dateString}.tif`,
      dispatch,
      () => setIsGeotiffLoading(false),
    );
    handleDownloadMenuClose();
  };

  const shouldShowDownloadButton =
    layer.type === 'admin_level_data' ||
    (layer.type === 'wms' &&
      layer.baseUrl.includes('api.earthobservation.vam.wfp.org/ows'));

  return (
    <>
      {shouldShowDownloadButton && (
        <Tooltip title="Download">
          <span>
            <IconButton
              disabled={!selected || isGeotiffLoading}
              onClick={handleDownloadMenuOpen}
              size={size || 'medium'}
            >
              <GetAppIcon fontSize={size || 'medium'} />
            </IconButton>
          </span>
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
          <MenuItem key="download-as-csv" onClick={handleDownloadCsv}>
            {t('Download as CSV')}
          </MenuItem>,
          <MenuItem key="download-as-geojson" onClick={handleDownloadGeoJson}>
            {t('Download as GeoJSON')}
          </MenuItem>,
        ]}
        {layer.type === 'wms' &&
          layer.baseUrl.includes('api.earthobservation.vam.wfp.org/ows') && (
            <MenuItem key="download-as-geotiff" onClick={handleDownloadGeoTiff}>
              {t('Download as GeoTIFF')}
            </MenuItem>
          )}
      </Menu>
    </>
  );
}

interface LayerDownloadOptionsProps {
  layerId: LayerKey;
  extent: Extent | undefined;
  selected: boolean;
  size?: 'small' | undefined;
}

export default LayerDownloadOptions;
