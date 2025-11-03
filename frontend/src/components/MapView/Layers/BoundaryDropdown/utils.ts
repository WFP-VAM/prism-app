import { SelectProps } from '@material-ui/core';
import {
  AdminCodeString,
  AdminLevelType,
  BoundaryLayerProps,
} from 'config/types';
import { LayerData } from 'context/layers/layer-data';
import { isEnglishLanguageSelected } from 'i18n';
import i18n from 'i18next';
import { Map as MaplibreMap } from 'maplibre-gl';
import { sortBy } from 'lodash';

/**
 * A tree of admin boundary areas, starting from
 * a single "root" element.
 */
export interface AdminBoundaryTree {
  label: string;
  key: AdminCodeString; // FIXME: duplicate of adminCode below?
  adminCode: AdminCodeString;
  level: AdminLevelType;
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
): AdminBoundaryTree {
  const locationLevelNames = isEnglishLanguageSelected(i18nLocale)
    ? layer.adminLevelNames
    : layer.adminLevelLocalNames;
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

  const addBranchToTree = (
    partialTree: AdminBoundaryTree,
    levelsLeft: AdminCodeString[],
    feature: any, // TODO: maplibre: feature
    level: AdminLevelType,
  ): AdminBoundaryTree => {
    const fp = feature.properties;
    if (levelsLeft.length === 0) {
      return partialTree;
    }
    const [currentLevelCode, ...otherLevelsCodes] = levelsLeft;
    const newBranch = addBranchToTree(
      partialTree.children[fp[currentLevelCode]] ?? {
        adminCode: fp[currentLevelCode],
        key: fp[layer.adminLevelNames[level]],
        label: fp[locationLevelNames[level]] ?? '',
        level: (level + 1) as AdminLevelType,
        children: {},
      },
      otherLevelsCodes,
      feature,
      (level + 1) as AdminLevelType,
    );
    // Filter out invalid branches (missing label or key in source data)
    if (newBranch.label === '' || newBranch.key === undefined) {
      return partialTree;
    }
    const newChildren = {
      ...partialTree.children,
      [fp[currentLevelCode]]: newBranch,
    };
    return { ...partialTree, children: newChildren };
  };

  return features.reduce<AdminBoundaryTree>(
    (outputTree, feature) =>
      addBranchToTree(
        outputTree,
        adminLevelCodes,
        feature,
        0 as AdminLevelType,
      ),
    rootNode,
  );
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
interface FlattenedAdminBoundary {
  label: string;
  key: AdminCodeString;
  adminCode: AdminCodeString;
  level: AdminLevelType;
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
  const searchLower = search.toLowerCase();

  function flattenSubTree(
    localSearch: string,
    subTree: AdminBoundaryTree,
  ): FlattenedAdminBoundary[] {
    const { children, ...node } = subTree;
    const isRoot =
      node.key === ('root' as AdminCodeString) &&
      node.level === (0 as AdminLevelType);

    const labelLower = (node.label ?? '').toLowerCase();
    const matchesNode =
      labelLower !== '' && labelLower.includes(localSearch.toLowerCase());

    // If the current node matches, drop the filter for its descendants
    const nextSearch = matchesNode ? '' : localSearch;

    const childrenToShow: FlattenedAdminBoundary[] = sortBy(
      Object.values(children),
      'label',
    ).flatMap(child => flattenSubTree(nextSearch, child));

    // Never include the artificial root node in the output
    if (isRoot) {
      return childrenToShow;
    }

    if (childrenToShow.length > 0 || matchesNode) {
      return [node as FlattenedAdminBoundary, ...childrenToShow];
    }
    return childrenToShow;
  }

  return flattenSubTree(searchLower, tree);
}
