import type { Feature, MultiPolygon, BBox } from '@turf/helpers';
import { sortBy } from 'lodash';
import bbox from '@turf/bbox';
import union from '@turf/union';
import { BoundaryLayerData } from '../../../context/layers/boundary';

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

type PropertyName = {
  adminLevelNameProperty: string;
  adminLevelNamePropertyChild: string;
  adminLevelNamePropertyParent: string;
};

type AdminLevelObject = {
  level: number;
  names: AdminLevelName[];
};

type AdminLevelProperty = {
  key: string;
  value: string;
};

type AdminLevelName = {
  name: AdminLevelProperty;
  parent: AdminLevelProperty;
  child: AdminLevelProperty;
};

const getAdminLevelValueSet = (
  features: Feature<MultiPolygon>[],
  propertyName: PropertyName,
): AdminLevelName[] => {
  const {
    adminLevelNameProperty,
    adminLevelNamePropertyParent,
    adminLevelNamePropertyChild,
  } = propertyName;

  // Get all possible values for the given adminLevelNameProperty.
  const values: AdminLevelName[] = features.map(feature => ({
    name: {
      key: adminLevelNameProperty,
      value: feature.properties![adminLevelNameProperty],
    },
    parent: {
      key: adminLevelNamePropertyParent,
      value: feature.properties![adminLevelNamePropertyParent],
    },
    child: {
      key: adminLevelNamePropertyChild,
      value: feature.properties![adminLevelNamePropertyChild],
    },
  }));

  const valueSet: AdminLevelName[] = values.reduce((set, item) => {
    if (
      set.find(
        itemSet =>
          item.name.value === itemSet.name.value &&
          item.parent.value === itemSet.parent.value,
      )
    ) {
      return set;
    }

    return [...set, item];
  }, [] as AdminLevelName[]);

  return valueSet;
};

const createRelationObj = (
  features: Feature<MultiPolygon>[],
  adminLevelName: AdminLevelName,
  level: number,
): BoundaryRelation => {
  const { name, parent, child } = adminLevelName;

  const matches = features
    .filter(
      feature =>
        feature.properties![name.key] === name.value &&
        feature.properties![parent.key] === parent.value,
    )
    .map(feature => feature as Feature<MultiPolygon>);

  // Create Bbox
  const unionGeom = matches.reduce((unionGeometry, match) => {
    const unionObj = union(unionGeometry, match);
    if (!unionObj) {
      return unionGeometry;
    }
    return unionObj as Feature<MultiPolygon>;
  }, matches[0]);

  const bboxUnion: BBox = bbox(unionGeom);

  // Get childrens.
  const children: string[] = matches
    .map(feature => feature.properties![child.key])
    .reduce((childrenSet, featureName) => {
      if (featureName === undefined || childrenSet.includes(featureName)) {
        return childrenSet;
      }

      return [...childrenSet, featureName];
    }, []);

  const parentNames: string[] = [
    ...new Set(matches.map(match => match.properties![parent.key])),
  ];

  // Parent names should be the same.
  return {
    name: name.value,
    parent: parentNames[0],
    level,
    children: Array.prototype.sort.call(children),
    bbox: bboxUnion,
  };
};

const buildRelationTree = (
  boundaryLayerData: BoundaryLayerData,
  adminLevelNames: string[],
): BoundaryRelation[] => {
  const { features } = boundaryLayerData;
  const featuresMulti = features as Feature<MultiPolygon>[];

  const propertyNames: PropertyName[] = adminLevelNames.map((_, index) => ({
    adminLevelNameProperty: adminLevelNames[index],
    adminLevelNamePropertyChild: adminLevelNames[index + 1],
    adminLevelNamePropertyParent: adminLevelNames[index - 1],
  }));

  const adminLevelObjects: AdminLevelObject[] = propertyNames.map(
    (propertyName, index) => ({
      level: index,
      names: getAdminLevelValueSet(featuresMulti, propertyName),
    }),
  );

  const relationsAdminLevel = adminLevelObjects.map(adminLevelValue => {
    const { level, names } = adminLevelValue;
    const relations = names.map(adminLevelName =>
      createRelationObj(featuresMulti, adminLevelName, level),
    );

    return relations;
  });

  const relationsFlatten = relationsAdminLevel.reduce(
    (arr, item) => [...arr, ...item],
    [] as BoundaryRelation[],
  );

  return relationsFlatten;
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

  return { levels: adminLevelNumbers, relations: results };
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
