import React, {
  createRef,
  useEffect,
  createContext,
  ReactNode,
  useContext,
} from 'react';
import 'ol/ol.css';
import OLMap from 'ol/Map';
import View, { ViewOptions } from 'ol/View';
import { createStyles, withStyles, WithStyles } from '@material-ui/core';
import { fromLonLat } from 'ol/proj';

export interface MapContextValues {
  map: OLMap;
}

const mapId = 'main-map';
const map = new OLMap({});

const mapContext = createContext<MapContextValues>({ map });

const Map = ({ classes, view, children }: MapProps) => {
  const mapDiv = createRef<HTMLDivElement>();

  useEffect(() => {
    const { center = [0, 0]} = view || {};
    const olView = new View({
      ...view,
      center: fromLonLat(center),
    });
    map.setTarget(mapDiv.current || undefined);
    map.setView(olView);
  }, [mapDiv, view]);

  return (
    <>
      <div className={classes.mapContainer} id={mapId} ref={mapDiv} />
      <mapContext.Provider value={{ map }}>{children}</mapContext.Provider>
    </>
  );
};

const styles = () =>
  createStyles({
    mapContainer: {
      height: '100%',
    },
  });

interface MapProps extends WithStyles<typeof styles> {
  children: ReactNode;
  view?: ViewOptions;
}

export const useMap = () => {
  const { map: mapObj } = useContext(mapContext);
  return mapObj;
};

export default withStyles(styles)(Map);
