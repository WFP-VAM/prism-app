import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AggregationOperations } from 'config/aggregationOperations';
import {
  ChartHeight,
  DashboardElementType,
  DashboardElements,
  Dashboard,
  DashboardMapPosition,
} from 'config/types';
import { appConfig } from 'config';
import type { RootState } from './store';

export type DashboardPreset = 'map-left' | 'map-right' | 'two-maps';
export type WizardStep = 'preset-selection' | 'slot-configuration' | 'editing';

export interface SlotConfig {
  type: DashboardElementType | null;
}

export interface DashboardEditorState {
  step: WizardStep;
  preset: DashboardPreset | null;
  sidebarSlots: SlotConfig[];
}

export const MAX_SIDEBAR_SLOTS = 3;

const initialState: DashboardEditorState = {
  step: 'preset-selection',
  preset: null,
  sidebarSlots: [],
};

const today = () => new Date().toISOString().slice(0, 10);

export const defaultElementForType = (
  type: DashboardElementType,
): DashboardElements => {
  switch (type) {
    case DashboardElementType.MAP:
      return {
        type: DashboardElementType.MAP,
        preSelectedMapLayers: [],
        legendVisible: true,
        legendPosition: DashboardMapPosition.right,
        minMapBounds: appConfig.map.boundingBox,
      };
    case DashboardElementType.TEXT:
      return { type: DashboardElementType.TEXT, content: '' };
    case DashboardElementType.CHART:
      return {
        type: DashboardElementType.CHART,
        startDate: today(),
        layerId: '',
        chartHeight: ChartHeight.TALL,
      };
    case DashboardElementType.TABLE:
      return {
        type: DashboardElementType.TABLE,
        startDate: today(),
        hazardLayerId: '',
        baselineLayerId: '',
        stat: AggregationOperations.Mean,
        maxRows: 10,
        addResultToMap: true,
        sortColumn: 'name',
        sortOrder: 'asc',
      };
    default:
      return { type: DashboardElementType.TEXT, content: '' };
  }
};

export const buildDraftDashboard = (
  preset: DashboardPreset,
  sidebarSlots: SlotConfig[],
): Dashboard => {
  const mapElement = defaultElementForType(DashboardElementType.MAP);
  const sidebarElements = sidebarSlots
    .filter(s => s.type !== null)
    .map(s => defaultElementForType(s.type!));

  switch (preset) {
    case 'map-left':
      return {
        title: 'New Dashboard',
        path: 'new-dashboard',
        isEditable: true,
        firstColumn: [mapElement],
        secondColumn: sidebarElements,
      };
    case 'map-right':
      return {
        title: 'New Dashboard',
        path: 'new-dashboard',
        isEditable: true,
        firstColumn: sidebarElements,
        secondColumn: [mapElement],
      };
    case 'two-maps':
      return {
        title: 'New Dashboard',
        path: 'new-dashboard',
        isEditable: true,
        firstColumn: [mapElement],
        secondColumn: [defaultElementForType(DashboardElementType.MAP)],
      };
    default:
      return {
        title: 'New Dashboard',
        path: 'new-dashboard',
        isEditable: true,
        firstColumn: [mapElement],
      };
  }
};

export const dashboardEditorSlice = createSlice({
  name: 'dashboardEditor',
  initialState,
  reducers: {
    selectPreset: (state, action: PayloadAction<DashboardPreset>) => {
      state.preset = action.payload;
      state.sidebarSlots = [];
      state.step = 'slot-configuration';
    },
    addSidebarSlot: state => {
      if (state.sidebarSlots.length < MAX_SIDEBAR_SLOTS) {
        state.sidebarSlots.push({ type: null });
      }
    },
    setSidebarSlotType: (
      state,
      action: PayloadAction<{ index: number; type: DashboardElementType }>,
    ) => {
      const { index, type } = action.payload;
      if (state.sidebarSlots[index]) {
        state.sidebarSlots[index].type = type;
      }
    },
    removeSidebarSlot: (state, action: PayloadAction<number>) => {
      state.sidebarSlots.splice(action.payload, 1);
    },
    setEditorStep: (state, action: PayloadAction<WizardStep>) => {
      state.step = action.payload;
    },
    resetWizard: () => initialState,
  },
});

export const {
  selectPreset,
  addSidebarSlot,
  setSidebarSlotType,
  removeSidebarSlot,
  setEditorStep,
  resetWizard,
} = dashboardEditorSlice.actions;

export const editorStepSelector = (state: RootState): WizardStep =>
  state.dashboardEditorState.step;
export const editorPresetSelector = (
  state: RootState,
): DashboardPreset | null => state.dashboardEditorState.preset;
export const editorSidebarSlotsSelector = (state: RootState): SlotConfig[] =>
  state.dashboardEditorState.sidebarSlots;

export default dashboardEditorSlice.reducer;
