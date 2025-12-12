import { sortBy } from 'lodash';
import bbox from '@turf/bbox';
import { BoundaryLayerData } from 'context/layers/boundary';
import {
  AdminLevelNameString,
  AdminCodeString,
  BoundaryLayerProps,
  AdminLevelType,
} from 'config/types';
import { BBox, Feature, MultiPolygon } from 'geojson';

export type BoundaryRelationsDict = { [key: string]: BoundaryRelationData };

export type BoundaryRelationData = {
  // same as AdminLevelType??
  levels: number[];
  relations: BoundaryRelation[];
};

export type BoundaryRelation = {
  name: string;
  adminCode: AdminCodeString;
  parent: string;
  level: AdminLevelType;
  children: string[];
  bbox: BBox;
};

/*
 * Recursive function that finds the relation matching name and level.
 * If there are children relations, the function is applied for each.
 */
const getFeatures = (
  relations: BoundaryRelation[],
  name: string,
  level: AdminLevelType,
): BoundaryRelation[] => {
  const relation = relations.find(i => i.level === level && i.name === name);

  if (!relation) {
    return [];
  }

  // Apply function to the children of the relation.
  const relChildren: BoundaryRelation[] = relation.children
    .map(childName =>
      getFeatures(relations, childName, (relation.level + 1) as AdminLevelType),
    )
    .reduce((acc, child) => [...acc, ...child], []);

  return [relation, ...relChildren];
};

/*
 * Recursive function that returns the parent of a given relation.
 * If the parent relation has another parent. The function is applied also.
 */
export const getParentRelation = (
  relations: BoundaryRelation[],
  parentName: string,
  level: number,
): BoundaryRelation[] => {
  const relation = relations.find(
    i => i.level === level && i.name === parentName,
  );

  if (!relation) {
    return [];
  }

  if (!relation.parent) {
    return [relation];
  }

  return [
    ...getParentRelation(relations, relation.parent, relation.level - 1),
    relation,
  ];
};

/*
 * Function that creates the array of relations from the lowest level administrative boundary layer.
 * For each feature, the function checks the administrative level from the adminLevelNames array.
 * Then, it searches for other features that match the same level and name.
 * Finally, taking all the matches, the bounding box is built, and the array of children relations is set.
 */
const buildRelationTree = (
  boundaryLayerData: BoundaryLayerData,
  adminLevelNames: AdminLevelNameString[],
  layer: BoundaryLayerProps,
): BoundaryRelation[] => {
  const { features } = boundaryLayerData;
  const featuresMulti = features as Feature<MultiPolygon>[];

  const featuresByAdminLevel = new Map<
    number,
    Map<string, Feature<MultiPolygon>[]>
  >();

  const processedRelations = new Set<string>();
  const relations: BoundaryRelation[] = [];

  // Pre-populate lookup maps - single pass through features
  featuresMulti.forEach(feature => {
    const { properties } = feature;
    if (!properties) {
      return;
    }

    adminLevelNames.forEach((adminLevelName, level) => {
      const searchName = properties[adminLevelName];
      if (!searchName) {
        return;
      }

      if (!featuresByAdminLevel.has(level)) {
        featuresByAdminLevel.set(level, new Map());
      }

      const levelMap = featuresByAdminLevel.get(level)!;
      if (!levelMap.has(searchName)) {
        levelMap.set(searchName, []);
      }

      const existingFeatures = levelMap.get(searchName)!;
      levelMap.set(searchName, [...existingFeatures, feature]);
    });
  });

  // Process unique combinations only - no redundant work
  Array.from(featuresByAdminLevel.entries()).forEach(([level, levelMap]) => {
    Array.from(levelMap.entries()).forEach(([searchName, matches]) => {
      const relationKey = `${searchName}-${level}`;

      if (processedRelations.has(relationKey)) {
        return;
      }
      processedRelations.add(relationKey);

      // Get properties from first match (they're all the same for this admin name/level)
      const { properties } = matches[0];

      const bboxUnion: BBox = bbox({
        type: 'FeatureCollection',
        features: matches,
      });

      const code = properties?.[layer.adminCode];
      const parent =
        level === 0 ? undefined : properties![adminLevelNames[level - 1]];

      const children =
        level === adminLevelNames.length - 1
          ? []
          : [
              ...new Set(
                matches
                  .map(
                    feature => feature.properties![adminLevelNames[level + 1]],
                  )
                  .filter(Boolean),
              ),
            ];
      const sortedChildren = sortBy(children);

      const relation: BoundaryRelation = {
        adminCode: code as AdminCodeString,
        bbox: bboxUnion,
        level: level as AdminLevelType,
        name: searchName,
        parent,
        children: sortedChildren,
      };

      relations.push(relation);
    });
  });

  return relations;
};

/*
 * Main function that creates the relations array using the buildRelationTree function.
 * Then, to render the dropdown menu, the function takes the first level relations and the
 * getFeatures function is called for each to make sure the children relations are included recursively
 * right after.
 */
export const loadBoundaryRelations = (
  boundaryLayerData: BoundaryLayerData,
  adminLevelNames: AdminLevelNameString[],
  layer: BoundaryLayerProps,
): BoundaryRelationData => {
  const relations = buildRelationTree(
    boundaryLayerData,
    adminLevelNames,
    layer,
  );

  const adminLevelNumbers = adminLevelNames.map(
    (_, index) => index as AdminLevelType,
  );

  const firstLevelRelations = relations.filter(
    rel => rel.level === adminLevelNumbers[0],
  );
  const sortedFirstLevelRelations = sortBy(firstLevelRelations, 'name');

  const results = sortedFirstLevelRelations.reduce(
    (acc, rel) => [
      ...acc,
      ...getFeatures(relations, rel.name, adminLevelNumbers[0]),
    ],
    [] as BoundaryRelation[],
  );

  return {
    levels: adminLevelNames.map((_, idx) => idx),
    relations: results,
  };
};

export const setMenuItemStyle = (
  level: number,
  levels: number[],
  styles: { [key: string]: string },
): string => {
  switch (level) {
    case levels[0]:
      return styles.header;
    case levels[levels.length - 1]:
      return styles.menuItem;
    default:
      return styles.subHeader;
  }
};

export const containsText = (text: string, searchText: string) =>
  (text?.toLowerCase().indexOf(searchText?.toLowerCase()) || 0) > -1;

/*
 * This function returns the higher level relations from a given relation match.
 * For each matching relation, the function finds recursively the parents in order
 * to be displayed before.
 */
export const createMatchesTree = (
  relations: BoundaryRelation[],
  relationsFilter: BoundaryRelation[],
): BoundaryRelation[] =>
  relationsFilter
    .reduce((acc, match) => {
      if (!match.parent) {
        return [...acc, match];
      }

      // Check if element has been already included.
      if (
        acc.find(rel => rel.name === match.name && rel.level === match.level)
      ) {
        return acc;
      }

      // Get all relations that have same parent and level.
      const matchParent = relationsFilter.filter(
        rel => rel.parent === match.parent && rel.level === match.level,
      );

      const getmatchedParents = getParentRelation(
        relations,
        match.parent,
        (match.level - 1) as AdminLevelType,
      );

      const mergedRelations = [...getmatchedParents, ...matchParent];

      return [...acc, ...mergedRelations];
    }, [] as BoundaryRelation[])
    // Discard repeated from parent matches.
    .reduce((acc, item) => {
      if (
        acc.find(elem => elem.name === item.name && elem.level === item.level)
      ) {
        return acc;
      }

      return [...acc, item];
    }, [] as BoundaryRelation[]);

export enum MapInteraction {
  GoTo = 'goto',
}
