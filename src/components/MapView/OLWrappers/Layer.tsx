import { useContext, useEffect } from 'react';
import BaseLayer from 'ol/layer/Base';

import { mapContext } from './Map';

const Layer = ({ layer }: { layer: BaseLayer }) => {
  const { map } = useContext(mapContext);

  useEffect(() => {
    map.addLayer(layer);
    // Deregister this layer when we go out of scope.
    return function cleanup() {
      map.removeLayer(layer);
    };
  }, [layer, map]);

  return null;
};

export default Layer;
