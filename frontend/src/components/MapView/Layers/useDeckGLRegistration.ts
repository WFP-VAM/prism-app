import { useDeckGLLayers } from 'components/MapView/DeckGLLayersContext';
import { useRef } from 'react';

/** Stable refs to DeckGLLayersContext register/unregister for use in effects. */
export function useDeckGLRegistration() {
  const { registerLayer, unregisterLayer } = useDeckGLLayers();
  const registerRef = useRef(registerLayer);
  const unregisterRef = useRef(unregisterLayer);
  registerRef.current = registerLayer;
  unregisterRef.current = unregisterLayer;
  return { registerRef, unregisterRef };
}
