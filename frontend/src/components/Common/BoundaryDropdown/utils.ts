import type { Feature, MultiPolygon, BBox } from '@turf/helpers';
import { sortBy } from 'lodash';
import bbox from '@turf/bbox';
import { BoundaryLayerData } from '../../../context/layers/boundary';

export type BoundaryRelationsDict = { [key: string]: BoundaryRelationData };

export type BoundaryRelationData = {
  levels: number[];
  relations: BoundaryRelation[];
};

export type BoundaryRelation = {
  name: string;
  parent: string;
  level: number;
  children: string[];
  bbox: BBox;
};

const getFeatures = (
  relations: BoundaryRelation[],
  name: string,
  level: number,
): BoundaryRelation[] => {
  const relation = relations.find(i => i.level === level && i.name === name);

  if (!relation) {
    return [];
  }

  const relChildren: BoundaryRelation[] = relation.children
    .map(childName => getFeatures(relations, childName, relation.level + 1))
    .reduce((acc, child) => [...acc, ...child], []);

  return [relation, ...relChildren];
};

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

const buildRelationTree = (
  boundaryLayerData: BoundaryLayerData,
  adminLevelNames: string[],
): BoundaryRelation[] => {
  const { features } = boundaryLayerData;
  const featuresMulti = features as Feature<MultiPolygon>[];

  const relations = featuresMulti.reduce((relationSet, searchFeature) => {
    const { properties } = searchFeature;

    const relationsFeature = adminLevelNames.reduce(
      (relationLevelSet, adminLevelName, level) => {
        const searchName = properties![adminLevelName];

        // If search name already exists within the featureSet, discard it.
        const relationMatch = relationSet.find(
          relation => relation.name === searchName && relation.level === level,
        );
        if (relationMatch) {
          return relationLevelSet;
        }

        // Find within featureCollection all features matching the property field and value.
        const matches: Feature<MultiPolygon>[] = featuresMulti.filter(
          feature => feature.properties![adminLevelName] === searchName,
        );

        const bboxUnion: BBox = bbox({
          type: 'FeatureCollection',
          features: matches,
        });

        const parent =
          level === 0 ? undefined : properties![adminLevelNames[level - 1]];

        const children =
          level === adminLevelNames.length - 1
            ? []
            : matches.map(
                feature => feature.properties![adminLevelNames[level + 1]],
              );
        const childrenSet = [...new Set(children)];
        const childrenSetSorted = Array.prototype.sort.call(childrenSet);

        const relation: BoundaryRelation = {
          bbox: bboxUnion,
          level,
          name: searchName,
          parent,
          children: childrenSetSorted,
        };

        return [...relationLevelSet, relation];
      },
      [] as BoundaryRelation[],
    );

    return [...relationSet, ...relationsFeature];
  }, [] as BoundaryRelation[]);

  return relations;
};

export const loadBoundaryRelations = (
  boundaryLayerData: BoundaryLayerData,
  adminLevelNames: string[],
): BoundaryRelationData => {
  const relations = buildRelationTree(boundaryLayerData, adminLevelNames);

  const adminLevelNumbers: number[] = adminLevelNames.map((_, index) => index);

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
  text.toLowerCase().indexOf(searchText.toLowerCase()) > -1;

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
        match.level - 1,
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
