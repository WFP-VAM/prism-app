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
