;
import { Offset } from 'maplibre-gl';
import { makeStyles, createStyles } from '@mui/styles';
import { Popup } from 'react-map-gl/maplibre';
import { LandfallInfo } from 'context/anticipatoryAction/AAStormStateSlice/parsedStormDataTypes';
import { AAStormTimeSeriesFeature } from 'prism-common/';
import PopupContent from './PopupContent';
import { isFeatureAtLandfallEstimateTime } from './utils';

const verticalLandfallPopupOffset = -50;
const horizontalLandfallPopupOffset = 25;

function AAStormLandfallPopup({
  feature,
  onClose,
  landfallInfo,
  reportDate,
}: AAStormLandfallPopupProps) {
  const classes = useStyles();

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
      longitude={lng}
      latitude={lat}
      anchor="top-left"
      offset={
        [verticalLandfallPopupOffset, horizontalLandfallPopupOffset] as Offset
      }
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
  feature: AAStormTimeSeriesFeature;
  landfallInfo: LandfallInfo | undefined;
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
        left: `${horizontalLandfallPopupOffset * 2}px`,
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
