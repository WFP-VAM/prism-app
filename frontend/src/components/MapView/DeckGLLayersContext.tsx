/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Layer } from '@deck.gl/core';

interface DeckGLLayersContextValue {
  /** All currently registered deck.gl layers, keyed by logical layer id. */
  layers: Map<string, Layer>;
  /** Register or replace a deck.gl layer. */
  registerLayer: (id: string, layer: Layer) => void;
  /** Remove a deck.gl layer. */
  unregisterLayer: (id: string) => void;
  /**
   * Version counter that increments on every register/unregister, letting the
   * DeckGLOverlay component know it needs to call setProps.
   */
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
    // version changes trigger consumers to re-read layers

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
