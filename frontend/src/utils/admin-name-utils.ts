import { BoundaryRelationData } from 'components/Common/BoundaryDropdown/utils';
import { BoundaryLayerProps } from 'config/types';
import {
  AdminNameDict,
  hasAdminNameSidecar,
} from 'context/adminNameTranslationStateSlice';
import i18n from 'i18next';
import { get } from 'lodash';

import { getFullLocationName } from './name-utils';

export function localizeName(
  englishName: string,
  dict?: AdminNameDict,
): string {
  if (!englishName || !dict) {
    return englishName;
  }
  return dict[englishName] ?? englishName;
}

export function getLocalizedFullLocationName(
  levelNames: string[],
  featureBoundary?: GeoJSON.Feature<
    GeoJSON.Geometry,
    GeoJSON.GeoJsonProperties
  >,
  dict?: AdminNameDict,
): string {
  const parts = levelNames
    .map(level => get(featureBoundary, ['properties', level], '') as string)
    .filter(Boolean)
    .map(name => localizeName(name, dict));

  return parts.join(', ') || 'No Name';
}

export function getActiveAdminNameLanguage(activeI18n: typeof i18n): string {
  return activeI18n.resolvedLanguage ?? activeI18n.language ?? 'en';
}

export function getAdminNameDictForLanguage(
  language: string,
  dict?: AdminNameDict,
): AdminNameDict | undefined {
  if (language === 'en' || !hasAdminNameSidecar(language)) {
    return undefined;
  }
  return dict;
}

export function usesAdminNameSidecar(layer: BoundaryLayerProps): boolean {
  return Boolean(layer.translationsPath);
}

export function getAdminDisplayLocationName(
  layer: BoundaryLayerProps,
  levelNames: string[],
  feature:
    | GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>
    | undefined,
  language: string,
  dict?: AdminNameDict,
): string {
  if (language === 'en') {
    return getFullLocationName(levelNames, feature);
  }

  if (usesAdminNameSidecar(layer) && hasAdminNameSidecar(language)) {
    return getLocalizedFullLocationName(levelNames, feature, dict);
  }

  const legacyKeys = levelNames.map(
    (_, index) => layer.adminLevelLocalNames[index],
  );
  return getFullLocationName(legacyKeys, feature);
}

export function getLocalizedAlternateLocationName(
  layer: BoundaryLayerProps,
  levelNames: string[],
  feature:
    | GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>
    | undefined,
  dict?: AdminNameDict,
): string {
  if (usesAdminNameSidecar(layer)) {
    return getLocalizedFullLocationName(levelNames, feature, dict);
  }

  const legacyKeys = levelNames.map(
    (_, index) => layer.adminLevelLocalNames[index],
  );
  return getFullLocationName(legacyKeys, feature);
}

export function localizeBoundaryRelationData(
  englishRelations: BoundaryRelationData,
  dict?: AdminNameDict,
): BoundaryRelationData {
  if (!dict) {
    return englishRelations;
  }

  return {
    ...englishRelations,
    relations: englishRelations.relations.map(relation => ({
      ...relation,
      name: localizeName(relation.name, dict),
      parent: relation.parent
        ? localizeName(relation.parent, dict)
        : relation.parent,
      children: relation.children.map(child => localizeName(child, dict)),
    })),
  };
}
