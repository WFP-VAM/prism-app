import {
  MarkunreadOutlined,
  LocalDrink,
  School,
  AccountTree,
  Block,
  //   Diversity3 in mui 5 for social assistance
} from '@material-ui/icons';

import { faSeedling, faSyringe } from '@fortawesome/free-solid-svg-icons';

// verify the import of these icons
import {
  faPersonDigging,
  faCow,
  faPlateWheat,
  faPeopleGroup,
  faHandshakeSimple,
} from '@fortawesome/free-???-svg-icons';

interface Action {
  name: string;
  icon: any; // Placeholder type for the icon, adjust as necessary
}

// Simplified, reusable action items with full names
const actions = {
  warnings: {
    name: 'Dissemination of early warning messages',
    icon: MarkunreadOutlined,
  },
  seeds: { name: 'Distribution of seeds for re-sowing', icon: faSeedling },
  seedsW2: {
    name: 'Distribution of seeds and vegetative material for the second season',
    // TODO - get 2 plant icon figma
    icon: faSeedling,
  },
  waterHoles: { name: 'Rehabilitation of boreholes', icon: LocalDrink },
  multiUse: {
    name: 'Transform boreholes into multi-use systems',
    icon: faPersonDigging,
  },
  cattle: {
    name: 'Moving Cattle to places with water availability',
    icon: faCow,
  },
  vaccination: {
    name: 'Vaccination of birds against New Castle',
    icon: faSyringe,
  },
  foodAssistance: { name: 'Food Assistance', icon: faPlateWheat },
  socialAssistance: { name: 'Social assistance', icon: faPeopleGroup }, // replace with 'Diversity3'
  schoolLunch: { name: 'School lunches', icon: School },
  procurement: {
    name: 'Launching tenders and other Procurement procedures',
    icon: AccountTree,
  },
  contracts: {
    name: 'Signing contracts and mobilization of assets',
    icon: faHandshakeSimple,
  },
  naMild: {
    name: 'No anticipatory action linked to Mild levels',
    icon: Block,
  },
};

// Define the map type
type ActionsMap = {
  [key: string]: Action[];
};

// Define the actions map
const actionsMap: ActionsMap = {
  readyModerateW1: [actions.procurement],
  readyModerateW2: [actions.procurement],
  readySevereW1: [actions.procurement],
  readySevereW2: [actions.procurement],
  setModerateW1: [
    actions.contracts,
    actions.warnings,
    actions.seeds,
    actions.waterHoles,
    actions.multiUse,
  ],
  setModerateW2: [
    actions.contracts,
    actions.warnings,
    actions.seeds,
    actions.vaccination,
    actions.socialAssistance,
  ],
  setSevereW1: [
    actions.contracts,
    actions.warnings,
    actions.cattle,
    actions.waterHoles,
    actions.multiUse,
  ],
  setSevereW2: [
    actions.contracts,
    actions.warnings,
    actions.foodAssistance,
    actions.schoolLunch,
    actions.socialAssistance,
  ],
};

// Function to get actions by state, severity, and window
function getActionsByStateSeverityAndWindow(
  state: string,
  severity: string,
  window: string,
): Action[] {
  const key = `${state}${severity}${window}`;
  return actionsMap[key] || [];
}
