import { safeCountry } from 'config';
import { Dashboard, DashboardElementType } from 'config/types';
import { defaultElementForType } from 'dashboardConfig/defaultElementForType';
import { generateSlugFromTitle } from 'utils/string-utils';

export { defaultElementForType };

export type DashboardPreset = 'map-left' | 'map-right' | 'two-maps';

export interface SlotConfig {
  type: DashboardElementType | null;
}

export const MAX_SIDEBAR_SLOTS = 3;

export interface DraftMeta {
  id: string;
  title: string;
  path: string;
  country: string;
}

export const buildDraftDashboard = (
  preset: DashboardPreset,
  sidebarSlots: SlotConfig[],
  meta: DraftMeta,
): Dashboard => {
  const mapElement = defaultElementForType(DashboardElementType.MAP);
  const sidebarElements = sidebarSlots
    .filter(s => s.type !== null)
    .map(s => defaultElementForType(s.type!));

  const base = { ...meta };

  switch (preset) {
    case 'map-left':
      return {
        ...base,
        firstColumn: [mapElement],
        secondColumn: sidebarElements,
      };
    case 'map-right':
      return {
        ...base,
        firstColumn: sidebarElements,
        secondColumn: [mapElement],
      };
    case 'two-maps':
      return {
        ...base,
        firstColumn: [mapElement],
        secondColumn: [defaultElementForType(DashboardElementType.MAP)],
      };
  }
};

export const buildDraftMeta = (existingDraftCount: number): DraftMeta => {
  const n = existingDraftCount + 1;
  const title = n === 1 ? 'New Dashboard' : `New Dashboard #${n}`;
  const id = crypto.randomUUID();
  return {
    id,
    title,
    path: generateSlugFromTitle(title),
    country: safeCountry,
  };
};
