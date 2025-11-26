import {
  Box,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
} from '@material-ui/core';
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { mapValues } from 'lodash';
import GetAppIcon from '@material-ui/icons/GetApp';
import {
  AdminLevelDataLayerProps,
  CompositeLayerProps,
  LayerKey,
  LegendDefinitionItem,
  SelectedDateTimestamp,
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
import { getRequestDateItem } from 'utils/server-utils';
import { LayerDefinitions, getStacBand } from 'config/utils';
import { getFormattedDate } from 'utils/date-utils';
import { safeCountry } from 'config';
import { Point } from 'geojson';

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

  const [downloadMenuAnchorEl, setDownloadMenuAnchorEl] =
    useState<HTMLElement | null>(null);
  const [isGeotiffLoading, setIsGeotiffLoading] = useState(false);
  const isAnalysisExposureLoading = useSelector(
    isExposureAnalysisLoadingSelector,
  );

  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const serverAvailableDates = useSelector(availableDatesSelector);
  const layerAvailableDates = serverAvailableDates[layer.id];
  const queryDateItem = useMemo(
    () =>
      getRequestDateItem(
        layerAvailableDates,
        selectedDate as SelectedDateTimestamp,
        false,
      ),
    [layerAvailableDates, selectedDate],
  );
  const requestDate = queryDateItem?.startDate || queryDateItem?.queryDate;

  const layerData = useSelector(
    layerDataSelector(layer.id, requestDate),
  ) as LayerData<AdminLevelDataLayerProps | CompositeLayerProps>;

  const handleDownloadMenuClose = () => {
    setDownloadMenuAnchorEl(null);
  };

  const handleDownloadMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setDownloadMenuAnchorEl(event.currentTarget);
  };

  const getFilename = useCallback((): string => {
    const safeTitle = layer.title ?? layer.id;
    if (
      selectedDate &&
      ((layer as AdminLevelDataLayerProps).dates ||
        (layer as CompositeLayerProps).dateLayer)
    ) {
      const dateString = getFormattedDate(selectedDate, 'snake');
      return `${safeCountry}_${safeTitle}_${dateString}`;
    }
    return safeTitle;
  }, [layer, selectedDate]);

  const handleDownloadGeoJson = (): void => {
    if (layerData) {
      const { features } = layerData.data;
      downloadToFile(
        {
          content: JSON.stringify({
            type: 'FeatureCollection',
            features,
          }),
          isUrl: false,
        },
        getFilename(),
        'application/json',
      );
      handleDownloadMenuClose();
      return;
    }
    console.warn(`No layer data available for ${layer.id}`);
  };

  const handleDownloadCsv = useCallback(() => {
    if (layerData && layer.type === 'admin_level_data') {
      const translatedColumnsNames = mapValues(
        (layerData as LayerData<AdminLevelDataLayerProps>)?.data.layerData[0],
        (_v, k) => (k === 'value' ? t(layerData.layer.id) : t(k)),
      );
      downloadToFile(
        {
          content: castObjectsArrayToCsv(
            (layerData as LayerData<AdminLevelDataLayerProps>)?.data.layerData,
            translatedColumnsNames,
            ';',
          ),
          isUrl: false,
        },
        getFilename(),
        'text/csv',
      );
      handleDownloadMenuClose();
    }
    if (layerData && layer.type === 'composite') {
      const compositeLayerData = layerData as LayerData<CompositeLayerProps>;
      const geoJsonFeatures = compositeLayerData?.data.features;
      const properties = geoJsonFeatures[0]?.properties;

      if (properties) {
        // Add coordinates to each feature's properties
        const csvData = geoJsonFeatures.map(feature => ({
          ...feature.properties,
          coordinates: (feature.geometry as Point).coordinates.join(', '),
        }));

        // Translate column names and set "value" to layer.id
        const translatedColumnsNames = mapValues(
          { coordinates: 'coordinates', ...properties },
          (_v, k) => (k === 'value' ? t(layerData.layer.id) : t(k)),
        );

        downloadToFile(
          {
            content: castObjectsArrayToCsv(
              csvData,
              translatedColumnsNames,
              ';',
            ),
            isUrl: false,
          },
          getFilename(),
          'text/csv',
        );
        handleDownloadMenuClose();
      }
    }
    console.warn(`No layer data available for ${layer.id}`);
  }, [layerData, layer.type, layer.id, getFilename, t]);

  const handleDownloadGeoTiff = useCallback(() => {
    const { serverLayerName, additionalQueryParams } = layer as WMSLayerProps;
    const band = getStacBand(additionalQueryParams);
    const dateString = getFormattedDate(selectedDate, 'default') as string;

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
  }, [layer, selectedDate, extent, layerId, dispatch]);

  // Helper function to escape special XML characters
  const escapeXml = (str: string): string =>
    str.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Helper function to generate QML content from legend
  const generateQmlContent = useCallback(
    (
      legend: LegendDefinitionItem[],
      opacity: number = 1,
      scalingFactor: number = 1,
    ): string => {
      let qml = `<!DOCTYPE qgis PUBLIC 'http://mrcc.com/qgis.dtd' 'SYSTEM'>
<qgis hasScaleBasedVisibilityFlag="0" styleCategories="AllStyleCategories">
    <pipe>
        <rasterrenderer opacity="${opacity}" alphaBand="-1" band="1" classificationMin="-1" classificationMax="inf" type="singlebandpseudocolor">
            <rasterTransparency />
            <rastershader>
                <colorrampshader colorRampType="DISCRETE" classificationMode="1" clip="0">`;
      // Add color entries for each legend item
      legend.forEach((item, index) => {
        const label = item.label
          ? escapeXml(item.label as string)
          : item.value.toString();

        // TEMPORARY: shift the value index by 1 to account for the 0 value
        // and match the QML style format. See https://github.com/WFP-VAM/prism-app/pull/1161
        const shouldShiftIndex =
          (legend[0].value === 0 ||
            (legend[0].label as string).includes('< -')) &&
          ((legend[0].label as string)?.includes('<') ||
            (legend[1].label as string)?.includes('<') ||
            (legend[1].label as string)?.includes('-') ||
            (legend[1].label as string)?.includes(' to '));

        const value =
          index < legend.length - 1
            ? (legend[index + Number(shouldShiftIndex)]?.value as number) *
              scalingFactor
            : 'INF';
        // eslint-disable-next-line fp/no-mutation
        qml += `
                    <item color="${item.color}" value="${value}" alpha="255" label="${label}" />`;
      });

      // End of QML file content
      // eslint-disable-next-line fp/no-mutation
      qml += `
                </colorrampshader>
            </rastershader>
        </rasterrenderer>
    </pipe>
</qgis>`;

      return qml;
    },
    [],
  );

  const handleDownloadQmlStyle = useCallback((): void => {
    const { legend, opacity, wcsConfig } = layer as WMSLayerProps;
    const scalingFactor = wcsConfig?.scale ? 1 / Number(wcsConfig.scale) : 1;
    const qmlContent = generateQmlContent(legend, opacity, scalingFactor);

    downloadToFile(
      {
        content: qmlContent,
        isUrl: false,
      },
      `${safeCountry}_${layerId}`,
      'application/qml',
    );

    handleDownloadMenuClose();
  }, [layer, generateQmlContent, layerId]);

  const shouldShowDownloadButton =
    !layer.disableDownload &&
    (layer.type === 'admin_level_data' ||
      layer.type === 'composite' ||
      (layer.type === 'wms' &&
        layer.baseUrl.includes('api.earthobservation.vam.wfp.org/ows')));

  return (
    <>
      {shouldShowDownloadButton && (
        <Tooltip title={t('Download') as string}>
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
          <Box
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
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
        {(layer.type === 'admin_level_data' || layer.type === 'composite') && [
          <MenuItem key="download-as-csv" onClick={handleDownloadCsv}>
            {t('Download as CSV')}
          </MenuItem>,
          <MenuItem key="download-as-geojson" onClick={handleDownloadGeoJson}>
            {t('Download as GeoJSON')}
          </MenuItem>,
        ]}
        {layer.type === 'wms' &&
          layer.baseUrl.includes('api.earthobservation.vam.wfp.org/ows') && [
            <MenuItem key="download-as-geotiff" onClick={handleDownloadGeoTiff}>
              {t('Download as GeoTIFF')}
            </MenuItem>,
            <MenuItem key="download-style" onClick={handleDownloadQmlStyle}>
              {t('Download QML Style')}
            </MenuItem>,
          ]}
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
