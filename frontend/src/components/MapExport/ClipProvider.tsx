import { ReactNode, useEffect, useMemo } from 'react';
import type { AdminAreaClipPolygon } from 'utils/adminAreaClipPolygon';
import {
  initClipRasterProtocol,
  registerClipPolygon,
} from 'utils/clipRasterProtocol';

import { ClipContext, ClipContextValue } from './clipContext';

/**
 * Registers the clip polygon (and the `clip://` raster protocol) and exposes it
 * to descendant layers via {@link ClipContext}. Passing `null` disables
 * clipping (the live MapView never wraps layers in a ClipProvider).
 */
export function ClipProvider({
  polygon,
  clipAdminLevelData = false,
  children,
}: {
  polygon: AdminAreaClipPolygon | null | undefined;
  clipAdminLevelData?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    initClipRasterProtocol();
  }, []);

  const value = useMemo<ClipContextValue | null>(() => {
    if (!polygon) {
      return null;
    }
    return {
      clipPolygon: polygon,
      clipId: registerClipPolygon(polygon),
      clipAdminLevelData,
    };
  }, [clipAdminLevelData, polygon]);

  return <ClipContext.Provider value={value}>{children}</ClipContext.Provider>;
}
