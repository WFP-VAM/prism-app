import { createElement, useEffect } from 'react';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import Feature, { FeatureLike } from 'ol/Feature';
import adminBoundaries from '../../../config/admin_boundaries.json';
import { Layer, useMap } from '../OLWrappers';

const strokeStyle = new Stroke({
  color: 'grey',
  width: 1,
});

const unhighlighted = new Style({
  stroke: strokeStyle,
});

const highlighted = new Style({
  fill: new Fill({
    color: 'darkgrey',
  }),
  stroke: strokeStyle,
});

const source = new VectorSource({
  features: new GeoJSON().readFeatures(adminBoundaries, {
    featureProjection: 'EPSG:3857',
  }),
});

const layer = new VectorLayer({
  source,
  opacity: 0.3,
  style: feature => {
    return ({
      MultiPolygon: unhighlighted,
    } as { [key: string]: Style })[feature.getGeometry().getType() as string];
  },
});

const isFeature = (maybeFeature: FeatureLike): maybeFeature is Feature =>
  maybeFeature && typeof (maybeFeature as any).setStyle !== 'undefined';

const Boundaries = () => {
  const map = useMap();

  useEffect(() => {
    // Set up listeners for hover
    map.on('pointermove', event => {
      if (event.dragging) {
        return;
      }

      const pixel = map.getEventPixel(event.originalEvent);
      source.getFeatures().forEach(feature => feature.setStyle(unhighlighted));
      map.forEachFeatureAtPixel(
        pixel,
        feature => isFeature(feature) && feature.setStyle(highlighted),
        {
          layerFilter: maybeLayer => maybeLayer === layer,
          hitTolerance: 5,
        },
      );
    });

    map.on('click', event => {
      const feature = map.forEachFeatureAtPixel(event.pixel, f => f, {
        layerFilter: maybeLayer => maybeLayer === layer,
        hitTolerance: 5,
      });

      if (isFeature(feature)) {
        // TODO: add to state
        console.log(`Clicked on ${feature.getProperties().ADM2_PCODE}`);
      }
    });
  }, [map]);

  return createElement(Layer, { layer });
};
export default Boundaries;
