import {
  Box,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
} from '@material-ui/core';
import React, { useState } from 'react';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import { mapValues } from 'lodash';
import {
  AdminLevelDataLayerProps,
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

function LayerDownloadOptions({
  layer,
  extent,
  selected,
}: LayerDownloadOptionsProps) {
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();

  const [
    downloadMenuAnchorEl,
    setDownloadMenuAnchorEl,
  ] = useState<HTMLElement | null>(null);
  const [isGeotiffLoading, setIsGeotiffLoading] = useState(false);

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

  return (
    <>
      <IconButton
        disabled={!selected || isGeotiffLoading}
        onClick={handleDownloadMenuOpen}
      >
        <MoreVertIcon />
      </IconButton>
      {isGeotiffLoading && (
        <Box display="flex" alignItems="center">
          <CircularProgress size="20px" />
        </Box>
      )}
      <Menu
        id="download-menu"
        anchorEl={downloadMenuAnchorEl}
        keepMounted
        open={Boolean(downloadMenuAnchorEl)}
        onClose={handleDownloadMenuClose}
      >
        <MenuItem onClick={handleDownloadMenuClose}>Exposure Analysis</MenuItem>
        {layer.type === 'admin_level_data' && (
          <>
            <MenuItem onClick={handleDownloadCsv}>Download as CSV</MenuItem>
            <MenuItem onClick={handleDownloadGeoJson}>
              Download as GeoJSON
            </MenuItem>
          </>
        )}
        {layer.type === 'wms' &&
          layer.baseUrl.includes('api.earthobservation.vam.wfp.org/ows') && (
            <MenuItem onClick={handleDownloadGeoTiff}>
              Download as GeoTIFF
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
}

export default LayerDownloadOptions;
