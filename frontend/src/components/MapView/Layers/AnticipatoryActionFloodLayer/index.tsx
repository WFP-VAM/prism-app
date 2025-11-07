import { AnticipatoryActionLayerProps, AnticipatoryAction } from 'config/types';
import { useAnticipatoryAction } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/useAnticipatoryAction';
import { useDefaultDate } from 'utils/useDefaultDate';
import { useSelector, useDispatch } from 'react-redux';
import { dateRangeSelector } from 'context/mapStateSlice/selectors';
import { setAAFloodSelectedStation } from 'context/anticipatoryAction/AAFloodStateSlice';
import { hidePopup } from 'context/tooltipStateSlice';
import { useFilteredFloodStations } from './useFilteredFloodStations';
import { FloodStationMarker } from './FloodStationMarker';

interface AnticipatoryActionFloodLayerProps {
  layer: AnticipatoryActionLayerProps;
}

function AnticipatoryActionFloodLayer({
  layer,
}: AnticipatoryActionFloodLayerProps) {
  // Load the layer default date if no date is selected
  useDefaultDate(layer.id);
  const { AAData } = useAnticipatoryAction(AnticipatoryAction.flood);
  const { stations, stationSummaryData } = AAData;
  const { startDate } = useSelector(dateRangeSelector);
  const dispatch = useDispatch();

  const handleFloodStationEvent = (stationName?: string) => {
    dispatch(hidePopup()); // Hide any existing popups
    if (stationName) {
      dispatch(setAAFloodSelectedStation(stationName));
    }
  };

  const filteredStations = useFilteredFloodStations(
    stations,
    stationSummaryData,
    startDate,
  );

  return (
    <>
      {filteredStations.map(station => {
        const stationSummary = stationSummaryData?.[station.station_name];
        if (!stationSummary) {
          return null;
        }

        return (
          <FloodStationMarker
            key={`flood-station-${station.station_id}`}
            station={station}
            stationSummary={stationSummary}
            interactive
            onClick={handleFloodStationEvent}
          />
        );
      })}
    </>
  );
}

export default AnticipatoryActionFloodLayer;
