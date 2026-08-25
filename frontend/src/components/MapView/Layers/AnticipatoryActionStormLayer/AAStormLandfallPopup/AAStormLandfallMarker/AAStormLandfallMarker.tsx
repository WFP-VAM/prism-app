import { Typography } from '@mui/material';
import {
  LANDFALL_MARKER_POPUP_CLASS,
  landfallMarkerTooltipTextSx,
} from 'components/MapView/Layers/layerPopupStyles';
import { ParsedStormData } from 'context/anticipatoryAction/AAStormStateSlice/parsedStormDataTypes';
import _React from 'react';
import { Popup } from 'react-map-gl/maplibre';

import { formatWindPointDate } from '../../utils';
import { findLandfallWindPoint, hasLandfallOccured } from '../utils';

function AAStormLandfallMarker({ stormData }: AAStormLandfallPopupProps) {
  const windpoint = findLandfallWindPoint(stormData);

  if (!windpoint) {
    return null;
  }

  const isVisible = !hasLandfallOccured(stormData);

  if (!isVisible) {
    return null;
  }

  const [lng, lat] = windpoint.geometry.coordinates;

  return (
    <Popup
      className={LANDFALL_MARKER_POPUP_CLASS}
      longitude={lng}
      latitude={lat}
      anchor="bottom"
      offset={25}
      closeButton={false}
      closeOnClick={false}
    >
      <Typography sx={landfallMarkerTooltipTextSx} variant="body1">
        LF: {formatWindPointDate(windpoint.properties.time)}
      </Typography>
    </Popup>
  );
}

interface AAStormLandfallPopupProps {
  stormData: ParsedStormData;
}

export default AAStormLandfallMarker;
