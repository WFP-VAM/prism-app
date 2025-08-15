import { memo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Switch } from '@material-ui/core';
import { LayerType } from 'config/types';
import { RootState } from 'context/store';
import {
  useMapInstanceActions,
  useMapInstanceSelectors,
} from '../MapInstanceContext';
import MapInstanceDateSelector from './DateSelector';

interface SwitchItemProps {
  layer: LayerType;
  extent?: [number, number, number, number];
}

const SwitchItem = memo(({ layer, extent: _extent }: SwitchItemProps) => {
  const { addLayer, removeLayer } = useMapInstanceActions();
  const { selectLayers } = useMapInstanceSelectors();

  // useSelector automatically receives the state from Redux
  const isLayerSelected = useSelector((state: RootState) =>
    selectLayers(state).some(l => l.id === layer.id),
  );

  const toggleLayerValue = useCallback(
    (checked: boolean) => {
      if (!checked) {
        removeLayer(layer);
      } else {
        addLayer(layer);
      }
    },
    [removeLayer, layer, addLayer],
  );

  return (
    <div>
      <Switch
        checked={isLayerSelected}
        onChange={e => toggleLayerValue(e.target.checked)}
        title={layer.title}
      />
      {isLayerSelected && <MapInstanceDateSelector layerId={layer.id} />}
    </div>
  );
});

export default SwitchItem;
