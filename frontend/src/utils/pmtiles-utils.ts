/**
 * PMTiles Protocol Handler for MapLibre
 *
 * This module sets up and manages the PMTiles protocol for efficient vector tile loading in MapLibre.
 * PMTiles is a single-file format for hosting vector tiles that enables efficient
 * loading and caching of map data.
 *
 * Key features:
 * - Registers a custom 'pmtiles://' protocol with MapLibre
 * - Maintains a singleton protocol instance to handle all PMTiles requests
 * - Caches PMTiles instances to prevent redundant loading
 * - Supports range requests for efficient tile loading
 *
 * Usage:
 * 1. Initialize the protocol when the app starts:
 *    initPmtilesProtocol();
 *
 * 2. Use PMTiles in your map source:
 *    <Source type="vector" url="pmtiles://example.com/boundaries.pmtiles">
 *
 */

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
