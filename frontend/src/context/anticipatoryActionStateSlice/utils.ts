import { AAWindowKeys } from 'config/utils';
import { AADataSeverityOrder } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/utils';
import { AACategoryType, AAPhaseType, AnticipatoryActionState } from './types';

export function calculateCombinedAAMapData(
  renderedDistricts: AnticipatoryActionState['renderedDistricts'],
  windowKey: typeof AAWindowKeys[number],
) {
  const otherWindowKey = AAWindowKeys.find(x => x !== windowKey);
  if (!otherWindowKey) {
    // this is never supposed to happen
    throw new Error('Unknown window key');
  }
  return Object.fromEntries(
    Object.entries(renderedDistricts[windowKey])
      .map(([district, val]) => {
        const thisWindowsSev = AADataSeverityOrder(val.category, val.phase);

        const otherWindowData = renderedDistricts[otherWindowKey][district];
        const otherWindowSev = AADataSeverityOrder(
          otherWindowData.category,
          otherWindowData.phase,
        );
        if (thisWindowsSev > otherWindowSev) {
          return [district, val];
        }
        if (thisWindowsSev < otherWindowSev) {
          return null;
        }
        if (windowKey === 'Window 1') {
          return [district, val];
        }
        return null;
      })
      .filter((x): x is any => x !== null),
  ) as {
    [district: string]: {
      category: AACategoryType;
      phase: AAPhaseType;
      isNew: boolean;
    };
  };
}
