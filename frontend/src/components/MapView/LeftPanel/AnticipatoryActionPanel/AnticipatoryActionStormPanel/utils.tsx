/* eslint-disable react-refresh/only-export-components */
import {
  AAPhaseType,
  AACategory,
} from 'context/anticipatoryAction/AAStormStateSlice/types';

const AACategoryPhaseMap: { [key in AACategory]: any } = {
  [AACategory.Severe]: {
    Set: {
      color: {
        background: '#E63701',
        text: 'white',
      },
      iconProps: { topText: 'S', bottomText: 'SEV', color: 'white' },
    },
    Ready: {
      color: {
        background: '#E63701',
        text: 'white',
      },
      iconProps: { topText: 'R', bottomText: 'SEV', color: 'white' },
    },
    na: {
      color: {
        background: 'grey',
        text: 'white',
      },
      iconProps: { topText: 'na', bottomText: 'SEV', color: 'black' },
    },
  },
  [AACategory.Moderate]: {
    Set: {
      color: {
        background: '#FF8934',
        text: 'black',
      },
      iconProps: { topText: 'S', bottomText: 'MOD', color: 'black' },
    },

    Ready: {
      color: {
        background: '#FF8934',
        text: 'black',
      },
      iconProps: { topText: 'R', bottomText: 'MOD', color: 'black' },
    },
    na: {
      color: {
        background: 'grey',
        text: 'white',
      },
      iconProps: { topText: 'na', bottomText: 'MOD', color: 'black' },
    },
  },
};

export function getAAColor(
  severity: AACategory,
  phase: AAPhaseType,
  forLayer: boolean = false,
) {
  const categoryData = AACategoryPhaseMap[severity];
  if (!forLayer) {
    return `repeating-linear-gradient(
      -45deg,
      #F1F1F1,
      #F1F1F1 10px,
      white 10px,
      white 20px
    )`;
  }
  if (categoryData.color) {
    return categoryData.color;
  }
  const phaseData = categoryData[phase];
  if (!phaseData) {
    throw new Error(`Icon not implemented: ${severity}, ${phase}`);
  }
  return phaseData.color;
}
