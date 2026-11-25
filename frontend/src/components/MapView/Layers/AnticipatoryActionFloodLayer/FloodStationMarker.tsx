import { Tooltip } from '@material-ui/core';
import { FloodStatusIcon } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/FloodStatusIcon';
import { FloodStation } from 'context/anticipatoryAction/AAFloodStateSlice/types';
import { floodStationKey } from 'context/anticipatoryAction/AAFloodStateSlice/utils';
import { Marker } from 'react-map-gl/maplibre';

const MARKER_SIZE = 20;

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
  const phase = stationSummary.phase;
  const statusLabel = phase ? `${phase} ${riskLevel}` : riskLevel;
  const icon = (
    <FloodStatusIcon phase={phase} riskLevel={riskLevel} size={MARKER_SIZE} />
  );

  const markerContent = interactive ? (
    <Tooltip title={station.station_name} arrow>
      <button
        style={{
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          lineHeight: 0,
        }}
        type="button"
        aria-label={`${station.station_name} flood station - ${statusLabel} risk level`}
        onClick={event => {
          event.stopPropagation();
          event.preventDefault();
          onClick?.(floodStationKey(station.station_id, station.station_name));
        }}
      >
        {icon}
      </button>
    </Tooltip>
  ) : (
    <div
      aria-label={`${station.station_name} flood station - ${statusLabel} risk level`}
    >
      {icon}
    </div>
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
