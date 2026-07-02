/* eslint-disable react-refresh/only-export-components */
import type { Layer } from '@deck.gl/core';
import type { LayerType } from 'config/types';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

/** Layer types that require deck.gl (MapboxOverlay + lazy chunk). */
export const DECK_GL_LAYER_TYPES: ReadonlySet<LayerType['type']> = new Set([
  'cog',
]);

interface DeckGLLayersContextValue {
  /** All currently registered deck.gl layers, keyed by logical layer id. */
  layers: Map<string, Layer>;
  registerLayer: (id: string, layer: Layer) => void;
  unregisterLayer: (id: string) => void;
  /** Version counter that increments on every register/unregister */
  version: number;
}

export const DeckGLLayersContext =
  createContext<DeckGLLayersContextValue | null>(null);

export function DeckGLLayersProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Stable map ref — mutations don't need to trigger re-renders themselves;
  // the `version` state is what drives the overlay update.
  const layersRef = useRef<Map<string, Layer>>(new Map());
  const [version, setVersion] = useState(0);

  const registerLayer = useCallback((id: string, layer: Layer) => {
    layersRef.current.set(id, layer);
    setVersion(v => v + 1);
  }, []);

  const unregisterLayer = useCallback((id: string) => {
    if (layersRef.current.has(id)) {
      layersRef.current.delete(id);
      setVersion(v => v + 1);
    }
  }, []);

  const value = useMemo(
    () => ({
      layers: layersRef.current,
      registerLayer,
      unregisterLayer,
      version,
    }),
    [registerLayer, unregisterLayer, version],
  );

  return (
    <DeckGLLayersContext.Provider value={value}>
      {children}
    </DeckGLLayersContext.Provider>
  );
}

export function useDeckGLLayers(): DeckGLLayersContextValue {
  const ctx = useContext(DeckGLLayersContext);
  if (!ctx) {
    throw new Error('useDeckGLLayers must be used inside DeckGLLayersProvider');
  }
  return ctx;
}
