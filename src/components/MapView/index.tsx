import React, { createElement, ComponentType } from 'react';
import ReactMapboxGl from 'react-mapbox-gl';
import { useSelector, useDispatch } from 'react-redux';
import {
  createStyles,
  WithStyles,
  CircularProgress,
  withStyles,
} from '@material-ui/core';
import { Map } from 'mapbox-gl';
import { uniq } from 'lodash';
import Boundaries from './Boundaries';
import NSOLayer from './Layers/NSOLayer';
import WMSLayer from './Layers/WMSLayer';
import GroundstationLayer from './Layers/GroundstationLayer';
import Legends from './Legends';
import DateSelector from './DateSelector';
import { layersSelector, isLoading, setMap } from '../../context/mapStateSlice';
import { availableDatesSelector } from '../../context/serverStateSlice';
import appConfig from '../../config/prism.json';
import {
  WMSLayerProps,
  LayerType,
  DiscriminateUnion,
} from '../../config/types';
import ImpactLayer from './Layers/ImpactLayer';

const MapboxMap = ReactMapboxGl({
  accessToken: process.env.REACT_APP_MAPBOX_TOKEN as string,
});

type LayerComponentsMap<U extends LayerType> = {
  [T in U['type']]: ComponentType<{ layer: DiscriminateUnion<U, 'type', T> }>;
};

const componentTypes: LayerComponentsMap<LayerType> = {
  wms: WMSLayer,
  nso: NSOLayer,
  impact: ImpactLayer,
  groundstation: GroundstationLayer,
};

function MapView({ classes }: MapViewProps) {
  const layers = useSelector(layersSelector);
  const loading = useSelector(isLoading);
  const dispatch = useDispatch();
  const serverAvailableDates = useSelector(availableDatesSelector);

  const serverLayers = layers.filter(
    (layer): layer is WMSLayerProps => layer.type === 'wms',
  );

  const selectedLayerDates = uniq(
    serverLayers
      .map(({ serverLayerName }) => serverAvailableDates[serverLayerName])
      .filter(value => value)
      .flat(),
  );

  const {
    map: { latitude, longitude, zoom },
  } = appConfig;

  // Saves a reference to base MapboxGL Map object in case child layers need access beyond the React wrappers
  const saveMap = (map: Map) => dispatch(setMap(() => map));

  return (
    <div className={classes.container}>
      {loading && (
        <div className={classes.loading}>
          <CircularProgress size={100} />
        </div>
      )}
      <MapboxMap
        // eslint-disable-next-line react/style-prop-object
        style="mapbox://styles/mapbox/light-v10"
        onStyleLoad={saveMap}
        center={[longitude, latitude]}
        zoom={[zoom]}
        containerStyle={{
          height: '100vh',
          width: '100vw',
        }}
      >
        <Boundaries />
        <>
          {layers.map(layer => {
            const component: ComponentType<{ layer: any }> =
              componentTypes[layer.type];
            return createElement(component, {
              key: layer.id,
              layer,
            });
          })}
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
    loading: {
      position: 'absolute',
      height: '100%',
      width: '100%',
      backgroundColor: 'black',
      opacity: 0.75,
      zIndex: 1,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

export interface MapViewProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(MapView);
