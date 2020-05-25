import React, { useState, useEffect } from 'react';
import ReactMapboxGl from 'react-mapbox-gl';
import { useSelector } from 'react-redux';
import { createStyles, WithStyles, withStyles } from '@material-ui/core';

import Boundaries from './Boundaries';
import { MapTooltip } from './MapTooltip';
import NSOLayers from './NSOLayers';
import WMSLayers from './WMSLayers';
import GroundstationLayers from './GroundstationLayers';
import Legends from './Legends';
import DateSelector from './DateSelector';
import { dateRangeSelector, layersSelector } from '../../context/mapStateSlice';
import { availableDatesSelector } from '../../context/serverStateSlice';

import appConfig from '../../config/prism.json';
import { AvailableDates } from '../../config/types';

const MapboxMap = ReactMapboxGl({
  accessToken: process.env.REACT_APP_MAPBOX_TOKEN as string,
});

function MapView({ classes }: MapViewProps) {
  const [popupCoordinates, setpopupCoordinates] = useState();
  const [popupLocation, setpopupLocation] = useState();
  const [popupData, setpopupData] = useState();
  const [showPopup, setshowPopup] = useState(false);
  const layers = useSelector(layersSelector);
  const serverAvailableDates = useSelector(availableDatesSelector);

  const baselineLayers = layers.filter(layer => layer.type === 'nso');
  const serverLayers = layers.filter(layer => layer.type === 'wms');
  const groundstationLayers = layers.filter(
    layer => layer.type === 'groundstation',
  );

  const selectedLayerDates = layers
    .map(({ serverLayer }) =>
      serverLayer ? serverAvailableDates.get(serverLayer) : undefined,
    )
    .filter(value => value) as AvailableDates;

  const { startDate } = useSelector(dateRangeSelector);

  const {
    map: { latitude, longitude, zoom },
  } = appConfig;

  useEffect(() => {
    setpopupData(undefined);
  }, [layers]);

  return (
    <div className={classes.container}>
      <MapboxMap
        // eslint-disable-next-line react/style-prop-object
        style="mapbox://styles/mapbox/light-v10"
        center={[longitude, latitude]}
        zoom={[zoom]}
        containerStyle={{
          height: '100vh',
          width: '100vw',
        }}
        onClick={() => {
          setshowPopup(false);
        }}
      >
        <Boundaries
          getCoordinates={(coordinates: any) => {
            // Sets state to undefined so data will not show up on tooltip for Groundstation data if circle point is not clicked on.
            setpopupData(undefined);
            setpopupCoordinates(coordinates);
            setshowPopup(true);
          }}
          getLocationName={(locationName: any) => {
            setpopupLocation(locationName);
          }}
        />
        {popupCoordinates && (
          <MapTooltip
            coordinates={popupCoordinates}
            locationName={popupLocation}
            popupData={popupData}
            dataTitle={layers.valueSeq().map(({ title }) => title)}
            showPopup={showPopup}
          />
        )}
        <NSOLayers
          layers={baselineLayers}
          getPopupData={(data: any) => {
            setpopupData(data);
          }}
        />
        <GroundstationLayers
          layers={groundstationLayers}
          getPopupData={(data: any) => {
            setpopupData(data);
          }}
        />
        <WMSLayers layers={serverLayers} selectedDate={startDate} />
      </MapboxMap>
      <DateSelector availableDates={selectedLayerDates} />
      <Legends layers={layers} />
    </div>
  );
}

const styles = () =>
  createStyles({
    container: {
      position: 'relative',
    },
  });

export interface MapViewProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(MapView);
