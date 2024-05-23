import React from 'react';
import {
  MarkunreadOutlined,
  LocalDrink,
  School,
  AccountTree,
  Remove,
  //   Diversity3 in mui 5 for social assistance
} from '@material-ui/icons';
import {
  faCow,
  faHandshake,
  faMoneyBillWave,
  faMoneyBillTransfer,
  faPeopleGroup,
  faPersonDigging,
  faPlateWheat,
  faSeedling,
  faSyringe,
  faList,
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

const IconSize = '1rem';

const FontAwesomeIconWrap = (props: FontAwesomeIconProps) => (
  <FontAwesomeIcon fontSize={IconSize} {...props} />
);

export interface Action {
  name: string;
  icon: React.JSX.Element;
}

const DoubleIcon = (props: FontAwesomeIconProps) => (
  <div style={{ display: 'flex', transform: 'scale(0.75)' }}>
    <FontAwesomeIcon fontSize={IconSize} {...props} />
    <FontAwesomeIcon
      fontSize={IconSize}
      style={{ paddingTop: '0.5rem', marginLeft: '-0.2rem' }}
      {...props}
    />
  </div>
);

// Reusable action items with full names
export const AActions = {
  warnings: {
    name: 'Dissemination of early warning messages',
    icon: <MarkunreadOutlined style={{ fontSize: IconSize }} />,
  },
  seeds: {
    name: 'Distribution of seeds for re-sowing',
    icon: <FontAwesomeIconWrap icon={faSeedling} />,
  },
  seedsW2: {
    name: 'Distribution of seeds and vegetative material for the second season',
    icon: <DoubleIcon icon={faSeedling} />,
  },
  waterHoles: {
    name: 'Rehabilitation of boreholes',
    icon: <LocalDrink style={{ fontSize: IconSize }} />,
  },
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
    icon: <AccountTree style={{ fontSize: IconSize }} />,
  },
  contracts: {
    name: 'Signing contracts and mobilization of assets',
    icon: <FontAwesomeIconWrap icon={faHandshake} />,
  },
  // Actions for Normal Phase (Zimbabwe)
  convening: {
    name: 'Convening with stakeholders',
    icon: <FontAwesomeIconWrap icon={faPeopleGroup} />,
  },
  requestingFunds: {
    name: 'Requesting funds',
    icon: <FontAwesomeIconWrap icon={faMoneyBillWave} />,
  },
  updatingLists: {
    name: 'Updating beneficiary lists',
    icon: <FontAwesomeIconWrap icon={faList} />,
  },
  climateInfo: {
    name: 'Dissemination of climate information',
    icon: <MarkunreadOutlined style={{ fontSize: IconSize }} />,
  },
  droughtInputs: {
    name: 'Distribution of drought tolerant inputs',
    icon: <FontAwesomeIconWrap icon={faSeedling} />,
  },
  waterProvision: {
    name: 'Water provision',
    icon: <LocalDrink style={{ fontSize: IconSize }} />,
  },
  cashTransfer: {
    name: 'In kind/cash transfer',
    icon: <FontAwesomeIconWrap icon={faMoneyBillTransfer} />,
  },
  // No Action
  naMild: {
    name: 'No anticipatory action linked to Mild levels',
    icon: <Remove style={{ fontSize: IconSize, color: 'darkgrey' }} />,
  },
  na: {
    name: 'No action',
    icon: <Remove style={{ fontSize: IconSize, color: 'darkgrey' }} />,
  },
};

type ActionsMap = {
  [key: string]: Action[];
};

// Define the actions map
const actionsMap: ActionsMap = {
  ReadyModerateW1: [AActions.procurement],
  ReadyModerateW2: [AActions.procurement],
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
  ReadyNormalW1: [
    AActions.convening,
    AActions.requestingFunds,
    AActions.updatingLists,
  ],
  ReadyNormalW2: [
    AActions.convening,
    AActions.requestingFunds,
    AActions.updatingLists,
  ],
  SetNormalW1: [
    AActions.climateInfo,
    AActions.droughtInputs,
    AActions.waterProvision,
  ],
  SetNormalW2: [AActions.climateInfo, AActions.cashTransfer],
};

// Function to get actions by state, severity, and window
export function getActionsByPhaseCategoryAndWindow(
  phase: AAPhaseType,
  category: AACategoryType,
  win: typeof AAWindowKeys[number],
): Action[] {
  if (category === 'Mild') {
    return [AActions.naMild];
  }
  const windowIndex = AAWindowKeys.findIndex(x => x === win) + 1;
  const key = `${phase}${category}W${windowIndex}`;
  return actionsMap[key] || [AActions.na];
}
