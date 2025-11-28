import { Marker } from 'react-map-gl/maplibre';
import { Tooltip } from '@mui/material';
import { FloodStation } from 'context/anticipatoryAction/AAFloodStateSlice/types';
import {
  getCircleBorderColor,
  getFloodRiskColor,
} from 'context/anticipatoryAction/AAFloodStateSlice/utils';

const CIRCLE_SIZE = 16;

interface FloodStationMarkerProps {
  station: FloodStation;
  stationSummary: FloodStation;
  /**
   * Whether the marker is interactive (clickable with tooltip).
   * If false, renders a static div suitable for print mode.
   * @default true
   */
  interactive?: boolean;
  /**
   * Optional click handler for interactive markers.
   * Only used when interactive is true.
   */
  onClick?: (stationName: string) => void;
}

/**
 * Renders a flood station marker with appropriate styling based on risk level.
 * Can be used in both interactive map views and print previews.
 */
export function FloodStationMarker({
  station,
  stationSummary,
  interactive = true,
  onClick,
}: FloodStationMarkerProps) {
  const riskLevel = stationSummary.trigger_status || 'Not exceeded';
  const circleColor = getFloodRiskColor(riskLevel);
  const borderColor = getCircleBorderColor(riskLevel);

  const markerContent = interactive ? (
    <Tooltip title={station.station_name} arrow>
      <button
        style={{
          width: CIRCLE_SIZE,
          height: CIRCLE_SIZE,
          boxSizing: 'content-box',
          padding: 0,
          borderRadius: '50%',
          backgroundColor: circleColor,
          border: `2px solid ${borderColor}`,
          cursor: 'pointer',
        }}
        type="button"
        aria-label={`${station.station_name} flood station - ${riskLevel} risk level`}
        onClick={event => {
          event.stopPropagation();
          event.preventDefault();
          onClick?.(station.station_name);
        }}
      />
    </Tooltip>
  ) : (
    <div
      style={{
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        boxSizing: 'content-box',
        padding: 0,
        borderRadius: '50%',
        backgroundColor: circleColor,
        border: `2px solid ${borderColor}`,
      }}
      aria-label={`${station.station_name} flood station - ${riskLevel} risk level`}
    />
  );

  return (
    <Marker
      longitude={station.longitude}
      latitude={station.latitude}
      anchor="center"
    >
      {markerContent}
    </Marker>
  );
}
