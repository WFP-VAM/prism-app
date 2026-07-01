import {
  horizontalLandfallPopupOffset,
  LANDFALL_INFO_POPUP_CLASS,
} from 'components/MapView/Layers/layerPopupStyles';
import { LandfallInfo } from 'context/anticipatoryAction/AAStormStateSlice/parsedStormDataTypes';
import { Offset } from 'maplibre-gl';
import { AAStormTimeSeriesFeature } from 'prism-common/';
import { Popup } from 'react-map-gl/maplibre';

import PopupContent from './PopupContent';
import { isFeatureAtLandfallEstimateTime } from './utils';

const verticalLandfallPopupOffset = -50;

function AAStormLandfallPopup({
  feature,
  onClose,
  landfallInfo,
  reportDate,
}: AAStormLandfallPopupProps) {
  if (!landfallInfo) {
    return null;
  }

  const isVisible = isFeatureAtLandfallEstimateTime(feature, landfallInfo.time);

  if (!isVisible) {
    return null;
  }

  const [lng, lat] = feature.geometry.coordinates;

  return (
    <Popup
      className={LANDFALL_INFO_POPUP_CLASS}
      longitude={lng}
      latitude={lat}
      anchor="top-left"
      offset={
        [verticalLandfallPopupOffset, horizontalLandfallPopupOffset] as Offset
      }
      closeButton={false}
      onClose={onClose}
      closeOnClick
      maxWidth="280px"
    >
      <PopupContent landfallInfo={landfallInfo} reportDate={reportDate} />
    </Popup>
  );
}

interface AAStormLandfallPopupProps {
  feature: AAStormTimeSeriesFeature;
  landfallInfo: LandfallInfo | undefined;
  reportDate: string;
  onClose: () => void;
}

export default AAStormLandfallPopup;
