/**
 * Context for export/print clipping. Outside export the value is `null`.
 */
import { createContext, useContext } from 'react';
import type { AdminAreaClipPolygon } from 'utils/adminAreaClipPolygon';

export interface ClipContextValue {
  clipPolygon: AdminAreaClipPolygon;
  clipId: string;
  /**
   * When false, vector data layers render unclipped. Full-region masks (no
   * admin selection) already match the dataset extent; vector clipping is only
   * needed when the user selects specific admin areas. Raster layers always
   * clip when a mask polygon is active.
   */
  clipAdminLevelData: boolean;
}

export const ClipContext = createContext<ClipContextValue | null>(null);

export function useClip(): ClipContextValue | null {
  return useContext(ClipContext);
}

/** Vector clip context only when specific admin areas are selected. */
export function useClipForSelectedAdminAreas(): ClipContextValue | null {
  const clip = useClip();
  return clip && clip.clipAdminLevelData ? clip : null;
}
