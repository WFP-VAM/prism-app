import { Protocol, PMTiles } from 'pmtiles';
import MapLibreGL from 'maplibre-gl';

// Create a singleton instance of the protocol
const protocol = new Protocol();

// Map to store PMTiles instances
const pmtilesInstances = new Map<string, PMTiles>();

export const initPmtilesProtocol = () => {
  MapLibreGL.addProtocol('pmtiles', protocol.tile);
  return () => {
    MapLibreGL.removeProtocol('pmtiles');
  };
};

export const getPmtilesInstance = (url: string) => {
  const instance = pmtilesInstances.get(url) ?? new PMTiles(url);
  if (!pmtilesInstances.has(url)) {
    protocol.add(instance);
    pmtilesInstances.set(url, instance);
  }
  return instance;
};
