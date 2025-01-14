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
      offset={25}
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
        border: 'none',
        borderRadius: '4px',
        boxShadow: 'inset 0px 1px 0px 0px #A4A4A4',
        position: 'relative',
      },

      '& > .maplibregl-popup-tip': {
        display: 'none',
      },

      // hack to display the popup tip without overlapping border
      '&::after': {
        background: '#F1F1F1',
        content: '""',
        position: 'absolute',
        left: '50%',
        top: -5,
        width: '10px',
        height: '10px',

        transform: 'translateX(-50%) rotate(45deg)',
        boxShadow: 'inset 1px 1px 0px 0px #A4A4A4',
      },
    },
  }),
);

export default AAStormLandfallPopup;
