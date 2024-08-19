import { FeatureInfoVisibility, FeatureTitleObject } from 'config/types';
import { PopupData } from 'context/tooltipStateSlice';
import { formatFeatureTitle } from './server-utils';

export const getTitle = (
  featureInfoTitle: FeatureTitleObject | undefined,
  properties: any,
): PopupData | {} => {
  if (!featureInfoTitle) {
    return {};
  }
  const titleField = Object.keys(featureInfoTitle).find(
    (field: string) =>
      featureInfoTitle[field].visibility !== FeatureInfoVisibility.IfDefined ||
      !!properties[field],
  );
  return titleField
    ? {
        title: {
          prop: titleField,
          data: formatFeatureTitle(
            properties[titleField],
            featureInfoTitle[titleField].type,
            featureInfoTitle[titleField].template,
            featureInfoTitle[titleField].labelMap,
          ),
        },
      }
    : {};
};
