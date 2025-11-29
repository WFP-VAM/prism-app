import { Popup } from 'react-map-gl/maplibre';
import { makeStyles, createStyles } from '@mui/styles';
import { ParsedStormData } from 'context/anticipatoryAction/AAStormStateSlice/parsedStormDataTypes';
import _React from 'react';
import { Typography } from '@mui/material';
import { findLandfallWindPoint, hasLandfallOccured } from '../utils';
import { formatWindPointDate } from '../../utils';

function AAStormLandfallMarker({ stormData }: AAStormLandfallPopupProps) {
  const classes = useStyles();

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
      longitude={lng}
      latitude={lat}
      anchor="bottom"
      offset={25}
      closeButton={false}
      closeOnClick={false}
      className={classes.popup}
    >
      <Typography className={classes.tooltipText} variant="body1">
        LF: {formatWindPointDate(windpoint.properties.time)}
      </Typography>
    </Popup>
  );
}

interface AAStormLandfallPopupProps {
  stormData: ParsedStormData;
}

const useStyles = makeStyles(() =>
  createStyles({
    tooltipText: {
      fontSize: '14px',
      fontWeight: 600,
      lineHeight: '14px',
      paddingBottom: '2px',
    },

    popup: {
      '& > .maplibregl-popup-content': {
        border: 'none',
        padding: '4px',
        borderRadius: '4px',
        background: 'white',
        boxShadow: 'inset 0px 0px 0px 1px #A4A4A4',
        position: 'relative',
      },

      '& > .maplibregl-popup-tip': {
        display: 'none',
      },

      // hack to display the popup tip without overlapping border
      '&::after': {
        content: '""',
        position: 'absolute',
        left: '50%',
        bottom: '-5px',
        width: '10px',
        height: '10px',
        background: 'white',
        transform: 'translateX(-50%) rotate(45deg)',
        borderWidth: '0px 1px 1px 0px',
        borderColor: '#A4A4A4',
        borderStyle: 'solid',
      },
    },
  }),
);

export default AAStormLandfallMarker;
