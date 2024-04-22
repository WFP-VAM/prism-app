import {
  AdminCodeString,
  AdminLevelType,
  BoundaryLayerProps,
} from 'config/types';
import { LayerData } from 'context/layers/layer-data';
import i18n, { isEnglishLanguageSelected } from 'i18n';
import { sortBy } from 'lodash';

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

export function flattenAreaTree(
  tree: AdminBoundaryTree,
  search: string = '',
): FlattenedAdminBoundary[] {
  function flattenSubTree(
    subTree: AdminBoundaryTree,
  ): FlattenedAdminBoundary[] {
    const { children, ...rest } = subTree;
    const childrenToShow = sortBy(Object.values(children), 'label').flatMap(
      flattenSubTree,
    );
    if (
      childrenToShow.length > 0 ||
      rest.label.toLowerCase().includes(search.toLowerCase())
    ) {
      return [rest, childrenToShow].flat();
    }
    return childrenToShow.flat();
  }
  return flattenSubTree(tree);
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
        label: fp[locationLevelNames[level]],
        level: (level + 1) as AdminLevelType,
        children: {},
      },
      otherLevelsCodes,
      feature,
      (level + 1) as AdminLevelType,
    );
    const newChildren = {
      ...partialTree.children,
      [fp[currentLevelCode]]: newBranch,
    };
    return { ...partialTree, children: newChildren };
  };

  return features.reduce<AdminBoundaryTree>((outputTree, feature) => {
    return addBranchToTree(
      outputTree,
      adminLevelCodes,
      feature,
      0 as AdminLevelType,
    );
  }, rootNode);
}
