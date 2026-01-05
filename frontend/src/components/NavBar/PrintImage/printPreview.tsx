import { useContext } from 'react';
import { useSelector } from 'react-redux';
import { appConfig } from 'config';
import { AAMarkersSelector } from 'context/anticipatoryAction/AADroughtStateSlice';
import { AAFloodDataSelector } from 'context/anticipatoryAction/AAFloodStateSlice';
import { useFilteredFloodStations } from 'components/MapView/Layers/AnticipatoryActionFloodLayer/useFilteredFloodStations';
import { leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import { Panel, AdminLevelDataLayerProps } from 'config/types';
import useLayers from 'utils/layers-utils';

import {
  dateRangeSelector,
  mapSelector,
} from '../../../context/mapStateSlice/selectors';
import PrintConfigContext from './printConfig.context';
import MapExportLayout from '../../MapExport/MapExportLayout';

function PrintPreview() {
  const { printConfig } = useContext(PrintConfigContext);

  const selectedMap = useSelector(mapSelector);
  const dateRange = useSelector(dateRangeSelector);
  const AAMarkers = useSelector(AAMarkersSelector);
  const floodState = useSelector(AAFloodDataSelector);
  const tabValue = useSelector(leftPanelTabValueSelector);

  const { logo } = appConfig.header || {};
  const { selectedLayers } = useLayers();
  const adminLevelLayersWithFillPattern = selectedLayers.filter(
    layer =>
      layer.type === 'admin_level_data' &&
      (layer.fillPattern || layer.legend.some(legend => legend.fillPattern)),
  ) as AdminLevelDataLayerProps[];

  const filteredFloodStations = useFilteredFloodStations(
    floodState.stationSummaryData,
    dateRange.startDate,
  );

  // Appease TS by ensuring printConfig is defined
  if (!printConfig || !selectedMap) {
    return null;
  }

  const {
    open,
    toggles,
    mapDimensions,
    titleText,
    titleRef,
    footerTextSize,
    footerText,
    footerRef,
    logoPosition,
    titleHeight,
    logoScale,
    legendPosition,
    legendScale,
    invertedAdminBoundaryLimitPolygon,
    printRef,
    footerHeight,
    bottomLogo,
    bottomLogoScale,
    setPreviewBounds,
    setPreviewZoom,
    setPreviewMapWidth,
    setPreviewMapHeight,
  } = printConfig;

  // Get the style and layers of the old map
  const selectedMapStyle = selectedMap.getStyle();

  // Determine active panel for AA markers
  const activePanel =
    tabValue === Panel.AnticipatoryActionDrought ||
    tabValue === Panel.AnticipatoryActionFlood
      ? tabValue
      : undefined;

  if (!open) {
    return null;
  }

  if (selectedMapStyle && !toggles.mapLabelsVisibility) {
    selectedMapStyle.layers = selectedMapStyle?.layers.filter(
      x => !x.id.includes('label'),
    );
  }

  return (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex' }}>
      <MapExportLayout
        toggles={toggles}
        aspectRatio={mapDimensions.aspectRatio}
        titleText={titleText}
        footerText={footerText}
        footerTextSize={footerTextSize}
        layerDate={dateRange.startDate}
        logo={logo}
        logoPosition={logoPosition}
        logoScale={logoScale}
        titleHeight={titleHeight}
        legendPosition={legendPosition}
        legendScale={legendScale}
        initialViewState={{
          longitude: selectedMap.getCenter().lng,
          latitude: selectedMap.getCenter().lat,
          zoom: selectedMap.getZoom(),
        }}
        mapStyle={selectedMapStyle}
        maxBounds={selectedMap.getMaxBounds() ?? undefined}
        invertedAdminBoundaryLimitPolygon={invertedAdminBoundaryLimitPolygon}
        printRef={printRef}
        titleRef={titleRef}
        footerRef={footerRef}
        footerHeight={footerHeight}
        bottomLogo={bottomLogo}
        bottomLogoScale={bottomLogoScale}
        aaMarkers={AAMarkers}
        floodStations={filteredFloodStations}
        activePanel={activePanel}
        adminLevelLayersWithFillPattern={adminLevelLayersWithFillPattern}
        onBoundsChange={(bounds, zoom) => {
          setPreviewBounds(bounds);
          setPreviewZoom(zoom);
        }}
        onMapDimensionsChange={(width, height) => {
          setPreviewMapWidth(width);
          setPreviewMapHeight(height);
        }}
      />
    </div>
  );
}

export default PrintPreview;
