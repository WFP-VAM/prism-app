import type { Feature, MultiPolygon, BBox, Polygon } from '@turf/helpers';
import bbox from '@turf/bbox';
import { multiPolygon } from '@turf/helpers';
import bboxPolygon from '@turf/bbox-polygon';
import union from '@turf/union';
import { BoundaryLayerData } from '../../../context/layers/boundary';

type BoundaryRelationData = {
  levels: number[];
  relations: BoundaryRelation[];
};

type FeatureRelation = {
  value: string;
  parent: string;
  child: string;
  bboxLowest: BBox; // Lowest Level bounding box.
  level: number;
};

export type BoundaryRelation = {
  name: string;
  parent: string;
  level: number;
  children: string[];
  bbox: BBox;
};

const getFeatureRelations = (
  adminLevelNames: string[],
  feature: Feature,
): FeatureRelation[] | undefined => {
  const { properties, geometry } = feature;

  if (!properties) {
    return undefined;
  }

  const relations = adminLevelNames.map((adminLevelName, index) => {
    return {
      level: index,
      value: properties[adminLevelName],
      parent: properties[adminLevelNames[index - 1]],
      child: properties[adminLevelNames[index + 1]],
    };
  });

  const featureBbox = bbox(
    multiPolygon((geometry as MultiPolygon).coordinates),
  );

  return relations.map(rel => ({ ...rel, bboxLowest: featureBbox }));
};

const makeBoundaryBbox = (bboxes: BBox[]): BBox => {
  const bboxPolygons = bboxes.map(box => bboxPolygon(box));

  const unionGeom = bboxPolygons.reduce((unionPolygon, polygon) => {
    const unionObj = union(unionPolygon, polygon);
    if (!unionObj) {
      return unionPolygon;
    }
    return unionObj as Feature<Polygon>;
  }, bboxPolygons[0]);

  return bbox(unionGeom);
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

export const loadBoundaryDropdownData = (
  boundaryLayerData: BoundaryLayerData,
  adminLevelNames: string[],
): BoundaryRelationData => {
  const featureRelations = boundaryLayerData.features.reduce((acc, feature) => {
    const relations = getFeatureRelations(adminLevelNames, feature as Feature);

    if (!relations) {
      return acc;
    }

    return [...acc, ...relations];
  }, [] as FeatureRelation[]);

  const adminLevelNumbers: number[] = adminLevelNames.map((_, index) => index);

  const relations = featureRelations.reduce((relationsAcc, relation) => {
    const { parent: searchParent, value: searchValue, level } = relation;

    // Discard value if exists already in the accumulator.
    const accMatches = relationsAcc.filter(
      relItem =>
        relItem.name === searchValue && relItem.parent === searchParent,
    );
    if (accMatches.length === 1) {
      return relationsAcc;
    }

    const matches = featureRelations.filter(
      fr => fr.parent === searchParent && fr.value === searchValue,
    );

    const children = matches
      .filter(match => match.child !== undefined)
      .map(match => match.child as string);

    const childrenSet = [...new Set(children)];

    const boundaryBbox = makeBoundaryBbox(matches.map(c => c.bboxLowest));

    const boundaryRelation = {
      name: searchValue,
      parent: searchParent,
      level,
      children: childrenSet,
      bbox: boundaryBbox,
    };

    return [...relationsAcc, boundaryRelation];
  }, [] as BoundaryRelation[]);

  const results = relations
    .filter(rel => rel.level === adminLevelNumbers[0])
    .reduce(
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
