import { createStyles, makeStyles } from '@material-ui/core';
import { black, cyanBlue } from 'muiTheme';
import {
  AACategoryType,
  AAPhaseType,
  AAcategory,
  AnticipatoryActionDataRow,
} from 'context/anticipatoryActionStateSlice/types';

export const AACategoryPhaseMap: { [key: string]: any } = {
  na: {
    color: '#F1F1F1',
    iconProps: { topText: 'na', bottomText: '-', color: 'black' },
  },
  ny: {
    color: '#F1F1F1', // Note: Special handling required for 'ny' in getAAColor for non-layer usage
    iconProps: { topText: 'ny', bottomText: '-', color: 'black' },
  },
  Severe: {
    Set: {
      color: '#831F00',
      iconProps: { topText: 'S', bottomText: 'SEV', color: 'white' },
    },
    Ready: {
      color: '#E63701',
      iconProps: { topText: 'R', bottomText: 'SEV', color: 'white' },
    },
    na: {
      color: '#F1F1F1',
      iconProps: { topText: 'na', bottomText: 'SEV', color: 'black' },
    },
  },
  Moderate: {
    Set: {
      color: '#FF8934',
      iconProps: { topText: 'S', bottomText: 'MOD', color: 'black' },
    },
    Ready: {
      color: '#FFD52D',
      iconProps: { topText: 'R', bottomText: 'MOD', color: 'black' },
    },
    na: {
      color: '#F1F1F1',
      iconProps: { topText: 'na', bottomText: 'MOD', color: 'black' },
    },
  },
  Mild: {
    Set: {
      color: '#FFF503',
      iconProps: { topText: 'S', bottomText: 'MIL', color: 'black' },
    },
    Ready: {
      color: '#FFFCB3',
      iconProps: { topText: 'R', bottomText: 'MIL', color: 'black' },
    },
    na: {
      color: '#F1F1F1',
      iconProps: { topText: 'na', bottomText: 'MIL', color: 'black' },
    },
  },
};

export function getAAColor(
  category: AACategoryType,
  phase: AAPhaseType,
  forLayer: boolean = false,
) {
  const categoryData = AACategoryPhaseMap[category];
  if (category === 'ny' && !forLayer) {
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
    throw new Error(`Icon not implemented: ${category}, ${phase}`);
  }
  return phaseData.color;
}

export function AADataSeverityOrder(
  category: AnticipatoryActionDataRow['category'],
  phase: AnticipatoryActionDataRow['phase'],
  bonus: number = 100,
) {
  const catIndex = AAcategory.findIndex(x => x === category);
  const phaseBonus = phase === 'Set' ? bonus : 0;

  return catIndex * 10 + phaseBonus;
}

export const useAACommonStyles = makeStyles(() =>
  createStyles({
    footerWrapper: { display: 'flex', flexDirection: 'column' },
    footerActionsWrapper: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: '0.5rem',
      gap: '1rem',
    },
    footerDialogsWrapper: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: '0.5rem',
      paddingTop: 0,
    },
    footerButton: { borderColor: cyanBlue, color: black },
    footerDialog: {
      textDecoration: 'underline',
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      textAlign: 'right',
    },
    footerWrapperVert: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    footerDialogsWrapperVert: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '0.5rem',
    },
    newTag: {
      height: '2em',
      padding: '0 0.5em',
      color: 'white',
      background: '#A4A4A4',
      fontSize: '10px',
      borderRadius: '32px',
      display: 'flex',
      alignItems: 'center',
    },
    windowHeader: {
      fontWeight: 'bold',
      textTransform: 'uppercase',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '0.5rem',
    },
  }),
);
