import { useRef, useEffect, useCallback } from 'react';
import { DeckGL } from '@deck.gl/react';
import { MapView } from '@deck.gl/core';

interface DeckOverlayProps {
  viewState: {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch: number;
    bearing: number;
  };
}

const DECK_VIEW = new MapView({ repeat: true });

export default function DeckOverlay({ viewState }: DeckOverlayProps) {
  const frameCount = useRef(0);
  const lastLogTime = useRef(Date.now());

  useEffect(() => {
    console.info('[DeckGL] Overlay mounted');
    return () => console.info('[DeckGL] Overlay unmounted');
  }, []);

  // Throttled sync logging -- logs every 2s during active movement
  useEffect(() => {
    frameCount.current += 1;
    const now = Date.now();
    if (now - lastLogTime.current >= 2000) {
      console.debug(
        '[DeckGL] viewState sync — lng: %s, lat: %s, zoom: %s (%d updates since last log)',
        viewState.longitude.toFixed(4),
        viewState.latitude.toFixed(4),
        viewState.zoom.toFixed(2),
        frameCount.current,
      );
      frameCount.current = 0;
      lastLogTime.current = now;
    }
  }, [viewState]);

  const onDeviceInitialized = useCallback((device: unknown) => {
    const gl = (device as { handle: WebGL2RenderingContext }).handle;
    console.info('[DeckGL] Device initialized', {
      renderer: gl.getParameter(gl.RENDERER),
      vendor: gl.getParameter(gl.VENDOR),
    });
  }, []);

  return (
    <DeckGL
      views={DECK_VIEW}
      viewState={viewState}
      layers={[]}
      controller={false}
      onDeviceInitialized={onDeviceInitialized}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}
