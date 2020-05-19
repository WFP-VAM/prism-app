import React from 'react';
import ReactMapboxGl from 'react-mapbox-gl';
import { useSelector } from 'react-redux';
import { createStyles, WithStyles, withStyles } from '@material-ui/core';
import Boundaries from './Boundaries';
import NSOLayers from './Layers/NSOLayers';
import WMSLayers from './Layers/WMSLayers';
import Legends from './Legends';
import DateSelector from './DateSelector';
import { dateRangeSelector, layersSelector } from '../../context/mapStateSlice';
import { availableDatesSelector } from '../../context/serverStateSlice';
import appConfig from '../../config/prism.json';
import {
  AvailableDates,
  WMSLayerProps,
  NSOLayerProps,
  AdminAggregateLayerProps,
} from '../../config/types';
import ImpactLayer from './Layers/ImpactLayer';

const MapboxMap = ReactMapboxGl({
  accessToken: process.env.REACT_APP_MAPBOX_TOKEN as string,
});

function MapView({ classes }: MapViewProps) {
  const layers = useSelector(layersSelector);
  const serverAvailableDates = useSelector(availableDatesSelector);

  const baselineLayers = layers.filter(
    (layer): layer is NSOLayerProps => layer.type === 'nso',
  );
  const serverLayers = layers.filter(
    (layer): layer is WMSLayerProps => layer.type === 'wms',
  );

  const selectedLayerDates = serverLayers
    .map(({ serverLayerName }) => serverAvailableDates.get(serverLayerName))
    .filter(value => value) as AvailableDates;

  const { startDate } = useSelector(dateRangeSelector);

  const {
    map: { latitude, longitude, zoom },
  } = appConfig;

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
      >
        <Boundaries />
        <NSOLayers layers={baselineLayers} />
        <WMSLayers layers={serverLayers} selectedDate={startDate} />
        <>
          {layers
            .filter(
              (layer): layer is AdminAggregateLayerProps =>
                layer.type === 'admin_district_aggregate',
            )
            .valueSeq()
            .toJS()
            .map(layer => (
              <ImpactLayer key={layer.id} layer={layer} />
            ))}
        </>
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
