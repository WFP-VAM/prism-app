/**
 * Context carrying the active admin-area clip polygon to data layer components
 * so they can clip at the source (raster via the `clip://` protocol; vector via
 * turf for layers that opt in). Outside export/print the value is `null`, so
 * layer components render exactly as before on the live map.
 *
 * The provider lives in ./ClipProvider so this module only exports a hook,
 * context, and types (keeping react-refresh happy).
 */
import { createContext, useContext } from 'react';
import type { AdminAreaClipPolygon } from 'utils/adminAreaClipPolygon';

export interface ClipContextValue {
  clipPolygon: AdminAreaClipPolygon;
  clipId: string;
  /**
   * When false, admin_level_data layers render unclipped. Full-region masks
   * (no admin selection) already match the dataset extent; clipping is only
   * needed when the user selects specific admin areas.
   */
  clipAdminLevelData: boolean;
}

export const ClipContext = createContext<ClipContextValue | null>(null);

export function useClip(): ClipContextValue | null {
  return useContext(ClipContext);
}
