import { SelectProps } from '@mui/material';
import {
  AdminCodeString,
  AdminLevelType,
  BoundaryLayerProps,
} from 'config/types';
import { AdminNameDict } from 'context/adminNameTranslationStateSlice';
import { LayerData } from 'context/layers/layer-data';
import i18n from 'i18next';
import { sortBy } from 'lodash';
import { Map as MaplibreMap } from 'maplibre-gl';
import {
  getActiveAdminNameLanguage,
  isAdminNameSentinel,
  localizeName,
  usesAdminNameSidecar,
} from 'utils/admin-name-utils';
import { normalizeAdminCode } from 'utils/adminAreaCodes';

/**
 * A tree of admin boundary areas, starting from
 * a single "root" element.
 */
export interface AdminBoundaryTree {
  label: string;
  key: AdminCodeString; // FIXME: duplicate of adminCode below?
  adminCode: AdminCodeString;
  level: AdminLevelType;
  iso3?: string;
  // children are indexed by AdminCodeStrings, not strings
  // but typescript won't allow being more specific
  children: { [code: string]: AdminBoundaryTree };
}

/**
 * Build a tree representing the hierarchy of admin
 * boundaries for the given data layer.
 */
export function getAdminBoundaryTree(
  data: LayerData<BoundaryLayerProps>['data'] | undefined,
  layer: BoundaryLayerProps,
  i18nLocale: typeof i18n,
  adminNameDict?: AdminNameDict,
): AdminBoundaryTree {
  const language = getActiveAdminNameLanguage(i18nLocale);
  const useSidecar = usesAdminNameSidecar(layer) || Boolean(adminNameDict);
  const englishLevelNames = layer.adminLevelNames;
  const { adminLevelCodes } = layer;
  const { features } = data || {};

  const rootNode = {
    adminCode: 'top' as AdminCodeString,
    level: 0 as AdminLevelType,
    key: 'root' as AdminCodeString,
    label: 'Placeholder tree element',
    children: {},
  };
  if (features === undefined) {
    return rootNode;
  }

  // Mutate rootNode in place. Spreading children on every feature is O(n^2)
  // and freezes the main thread on the unfiltered global feature set.
  features.forEach(feature => {
    const fp = (feature as any).properties;
    if (!fp) {
      return;
    }
    let node: AdminBoundaryTree = rootNode;
    for (let level = 0; level < adminLevelCodes.length; level += 1) {
      const branchCode = normalizeAdminCode(fp[adminLevelCodes[level]]);
      if (branchCode === null) {
        break;
      }
      const englishLabel = fp[englishLevelNames[level]] ?? '';
      // Localize whenever a sidecar dict is loaded, even if this layer
      // omitted translationsPath (Go To uses admin2; path used to live only
      // on admin0/admin3).
      const label =
        language !== 'en' && (useSidecar || adminNameDict)
          ? localizeName(englishLabel, adminNameDict)
          : language === 'en'
            ? englishLabel
            : (fp[layer.adminLevelLocalNames[level]] ?? '');
      const key = fp[englishLevelNames[level]];
      // Filter out invalid or placeholder branches using the raw English name
      // so filtering is language-independent (sidecars may translate "N/A").
      if (
        label === '' ||
        key === undefined ||
        isAdminNameSentinel(englishLabel)
      ) {
        break;
      }
      let child = node.children[branchCode];
      if (!child) {
        // Normalize to string so all UI state (selection, dropdown values, URL
        // params) is consistent. Universal PMTiles store these as numbers.
        child = {
          adminCode: branchCode,
          key,
          label,
          level: (level + 1) as AdminLevelType,
          iso3: typeof fp.iso3 === 'string' ? fp.iso3 : undefined,
          children: {},
        };
        node.children[branchCode] = child;
      }
      node = child;
    }
  });

  return rootNode;
}

export interface BoundaryDropdownProps {
  className: string;
  labelMessage?: string;
  map?: MaplibreMap | undefined;
  selectAll?: boolean;
  size?: 'small' | 'medium';
  selectedBoundaries?: AdminCodeString[];
  setSelectedBoundaries?: (
    boundaries: AdminCodeString[],
    appendMany?: boolean,
  ) => void;
  selectProps?: SelectProps;
  goto?: boolean;
  multiple?: boolean;
}

export const TIMEOUT_ANIMATION_DELAY = 10;

/**
 * Flattened version of the tree above, used to build
 * dropdowns.
 */
export interface FlattenedAdminBoundary {
  label: string;
  key: AdminCodeString;
  adminCode: AdminCodeString;
  level: AdminLevelType;
  iso3?: string;
}

/**
 * Flatten an admin tree into a list of admin areas, sorted
 * "as you would expect": sub-areas follow their parent area,
 * ordered alphabetically.
 * Returned array includes parents and children of matched
 * elements.
 */
export function flattenAreaTree(
  tree: AdminBoundaryTree,
  search: string = '',
): FlattenedAdminBoundary[] {
  function flattenSubTree(
    localSearch: string,
    subTree: AdminBoundaryTree,
  ): FlattenedAdminBoundary[] {
    const { children, ...node } = subTree;
    // Skip the root placeholder node (it's just a container)
    const isRootPlaceholder = node.adminCode === 'top' && node.key === 'root';

    // if current node matches the search string, include it and all its children
    // without filtering them, otherwise keep searching through the children
    const boundFlatten = node.label
      .toLowerCase()
      .includes(localSearch.toLowerCase())
      ? flattenSubTree.bind(null, '')
      : flattenSubTree.bind(null, localSearch);
    const childrenToShow: FlattenedAdminBoundary[] = sortBy(
      Object.values(children),
      'label',
    ).flatMap(boundFlatten);
    if (
      childrenToShow.length > 0 ||
      node.label.toLowerCase().includes(localSearch.toLowerCase())
    ) {
      // Don't include the root placeholder node in the result
      return isRootPlaceholder
        ? childrenToShow.flat()
        : [node, childrenToShow].flat();
    }
    return childrenToShow.flat();
  }
  return flattenSubTree(search, tree);
}
