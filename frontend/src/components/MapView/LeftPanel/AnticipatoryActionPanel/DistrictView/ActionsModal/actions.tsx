import React from 'react';
import {
  MarkunreadOutlined,
  LocalDrink,
  School,
  AccountTree,
  Block,
  //   Diversity3 in mui 5 for social assistance
} from '@material-ui/icons';
import {
  faCow,
  faHandshake,
  faPeopleGroup,
  faPersonDigging,
  faPlateWheat,
  faSeedling,
  faSyringe,
} from '@fortawesome/free-solid-svg-icons';
import {
  FontAwesomeIcon,
  FontAwesomeIconProps,
} from '@fortawesome/react-fontawesome';
import {
  AACategoryType,
  AAPhaseType,
} from 'context/anticipatoryActionStateSlice/types';
import { AAWindowKeys } from 'config/utils';

const FontAwesomeIconWrap = (props: FontAwesomeIconProps) => (
  <FontAwesomeIcon fontSize="1.5rem" {...props} />
);

export interface Action {
  name: string;
  icon: any; // Placeholder type for the icon, adjust as necessary
}

const DoubleIcon = (props: FontAwesomeIconProps) => (
  <div style={{ display: 'flex' }}>
    <FontAwesomeIcon fontSize="1rem" {...props} />
    <FontAwesomeIcon
      fontSize="1rem"
      style={{ paddingTop: '0.5rem', marginLeft: '-0.2rem' }}
      {...props}
    />
  </div>
);

// Simplified, reusable action items with full names
export const AActions = {
  warnings: {
    name: 'Dissemination of early warning messages',
    icon: <MarkunreadOutlined />,
  },
  seeds: {
    name: 'Distribution of seeds for re-sowing',
    icon: <FontAwesomeIconWrap icon={faSeedling} />,
  },
  seedsW2: {
    name: 'Distribution of seeds and vegetative material for the second season',
    // TODO - get 2 plant icon figma
    icon: <DoubleIcon icon={faSeedling} />,
  },
  waterHoles: { name: 'Rehabilitation of boreholes', icon: <LocalDrink /> },
  multiUse: {
    name: 'Transform boreholes into multi-use systems',
    icon: <FontAwesomeIconWrap icon={faPersonDigging} />,
  },
  cattle: {
    name: 'Moving Cattle to places with water availability',
    icon: <FontAwesomeIconWrap icon={faCow} />,
  },
  vaccination: {
    name: 'Vaccination of birds against New Castle',
    icon: <FontAwesomeIconWrap icon={faSyringe} />,
  },
  foodAssistance: {
    name: 'Food Assistance',
    icon: <FontAwesomeIconWrap icon={faPlateWheat} />,
  },
  socialAssistance: {
    name: 'Social assistance',
    icon: <FontAwesomeIconWrap icon={faPeopleGroup} />,
  }, // replace with 'Diversity3'
  schoolLunch: { name: 'School lunches', icon: <School /> },
  procurement: {
    name: 'Launching tenders and other Procurement procedures',
    icon: <AccountTree />,
  },
  contracts: {
    name: 'Signing contracts and mobilization of assets',
    icon: <FontAwesomeIconWrap icon={faHandshake} />,
  },
  naMild: {
    name: 'No anticipatory action linked to Mild levels',
    icon: <Block />,
  },
};

// Define the map type
type ActionsMap = {
  [key: string]: Action[];
};

// Define the actions map
const actionsMap: ActionsMap = {
  ReadyModerateW1: [AActions.procurement],
  ModerateW2: [AActions.procurement],
  ReadySevereW1: [AActions.procurement],
  ReadySevereW2: [AActions.procurement],
  SetModerateW1: [
    AActions.contracts,
    AActions.warnings,
    AActions.seeds,
    AActions.waterHoles,
    AActions.multiUse,
  ],
  SetModerateW2: [
    AActions.contracts,
    AActions.warnings,
    AActions.seeds,
    AActions.vaccination,
    AActions.socialAssistance,
  ],
  SetSevereW1: [
    AActions.contracts,
    AActions.warnings,
    AActions.cattle,
    AActions.waterHoles,
    AActions.multiUse,
  ],
  SetSevereW2: [
    AActions.contracts,
    AActions.warnings,
    AActions.foodAssistance,
    AActions.schoolLunch,
    AActions.socialAssistance,
  ],
};

// Function to get actions by state, severity, and window
export function getActionsByPhaseCategoryAndWindow(
  phase: AAPhaseType,
  category: AACategoryType,
  win: typeof AAWindowKeys[number],
): Action[] {
  const windowIndex = AAWindowKeys.findIndex(x => x === win) + 1;
  const key = `${phase}${category}W${windowIndex}`;
  return actionsMap[key] || [];
}