import { createStyles, makeStyles } from '@material-ui/core';
import { Point } from 'geojson';
import { Popup } from 'react-map-gl/maplibre';
import { LandfallInfo } from 'context/anticipatoryAction/AAStormStateSlice/parsedStromDataTypes';
import PopupContent from './PopupContent';

function AAStormLandfallPopup({
  point,
  onClose,
  landfallInfo,
  reportDate,
}: AAStormLandfallPopupProps) {
  const classes = useStyles();

  const lng = point.coordinates[0];
  const lat = point.coordinates[1];

  return (
    <Popup
      longitude={lng}
      latitude={lat}
      anchor="top"
      offset={15}
      closeButton={false}
      onClose={onClose}
      closeOnClick
      className={classes.popup}
      maxWidth="280px"
    >
      <PopupContent landfallInfo={landfallInfo} reportDate={reportDate} />
    </Popup>
  );
}

interface AAStormLandfallPopupProps {
  point: Point;
  landfallInfo: LandfallInfo;
  reportDate: string;
  onClose: () => void;
}

const useStyles = makeStyles(() =>
  createStyles({
    popup: {
      width: '280px',

      '& > .maplibregl-popup-content': {
        background: '#F1F1F1',
        padding: '0px 2px 0px 2px',
      },
      '& > .maplibregl-popup-tip': {
        borderBottomColor: '#F1F1F1',
        borderLeftWidth: '8px',
        borderRightWidth: '8px',
      },
    },
  }),
);

export default AAStormLandfallPopup;
