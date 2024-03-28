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

const FontAwesomeIconWrap = (props: FontAwesomeIconProps) => (
  <FontAwesomeIcon fontSize="1.5rem" {...props} />
);

interface Action {
  name: string;
  icon: any; // Placeholder type for the icon, adjust as necessary
}

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
    icon: <FontAwesomeIconWrap icon={faSeedling} />,
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
  readyModerateW1: [AActions.procurement],
  readyModerateW2: [AActions.procurement],
  readySevereW1: [AActions.procurement],
  readySevereW2: [AActions.procurement],
  setModerateW1: [
    AActions.contracts,
    AActions.warnings,
    AActions.seeds,
    AActions.waterHoles,
    AActions.multiUse,
  ],
  setModerateW2: [
    AActions.contracts,
    AActions.warnings,
    AActions.seeds,
    AActions.vaccination,
    AActions.socialAssistance,
  ],
  setSevereW1: [
    AActions.contracts,
    AActions.warnings,
    AActions.cattle,
    AActions.waterHoles,
    AActions.multiUse,
  ],
  setSevereW2: [
    AActions.contracts,
    AActions.warnings,
    AActions.foodAssistance,
    AActions.schoolLunch,
    AActions.socialAssistance,
  ],
};

// Function to get actions by state, severity, and window
export function getActionsByStateSeverityAndWindow(
  state: string,
  severity: string,
  window: string,
): Action[] {
  const key = `${state}${severity}${window}`;
  return actionsMap[key] || [];
}
