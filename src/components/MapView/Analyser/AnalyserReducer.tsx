import { useReducer } from 'react';
import { LayerKey, AggregationOperations, isLayerKey } from '../../../config/types';

interface AnalyserForm {
  [key: string]: any
  hazardLayerId: LayerKey | 'placeholder',
  baselineLayerId: LayerKey | 'placeholder',
  statistic: AggregationOperations,
  selectedDate: number | null,
  belowThreshold: string,
  aboveThreshold: string,
  thresholdError: string | null,
}

// Initial form values.
const initForm: AnalyserForm = {
  hazardLayerId: 'placeholder',
  baselineLayerId: 'placeholder',
  statistic: AggregationOperations.Mean,
  selectedDate: null,
  belowThreshold: '0',
  aboveThreshold: '0',
  thresholdError: null,
};

export enum ActionTypes {
  SET_FORM = "SET_FORM",
  SET_HAZARD_LAYER_ID = "SET_HAZARD_LAYER_ID",
  SET_BASELINE_LAYER_ID = "SET_BASELINE_LAYER_ID",
  SET_SELECTED_DATE = "SET_SELECTED_DATE",
  SET_STATISTIC = "SET_STATISTIC",
  SET_BELOW_THRESHOLD = "SET_BELOW_THRESHOLD",
  SET_ABOVE_THRESHOLD = "SET_ABOVE_THRESHOLD",
}

type AnlayserAction = {
  type: ActionTypes.SET_FORM,
  params: {
    hazardLayerId: LayerKey | 'placeholder',
    baselineLayerId: LayerKey | 'placeholder',
    statistic: AggregationOperations,
    selectedDate: number | null,
    belowThreshold: string,
    aboveThreshold: string
  }
} | {
  type: ActionTypes.SET_HAZARD_LAYER_ID,
  layerKey: LayerKey
} | {
  type: ActionTypes.SET_BASELINE_LAYER_ID,
  layerKey: LayerKey
} | {
  type: ActionTypes.SET_STATISTIC,
  statistic: AggregationOperations
} | {
  type: ActionTypes.SET_SELECTED_DATE,
  date: null | number
} | {
  type: ActionTypes.SET_BELOW_THRESHOLD,
  value: string
} | {
  type: ActionTypes.SET_ABOVE_THRESHOLD,
  value: string
};

const analyserReducer = (state: AnalyserForm, payload: AnlayserAction) => {
  switch (payload.type) {
    case ActionTypes.SET_FORM: {
      const payloadParams = payload.params;

      return {
        ...state,
        hazardLayerId: payloadParams.hazardLayerId,
        baselineLayerId: payloadParams.baselineLayerId,
        statistic: payloadParams.statistic,
        selectedDate: payloadParams.selectedDate,
        belowThreshold: payloadParams.belowThreshold,
        aboveThreshold: payloadParams.aboveThreshold
      };
    }
    case ActionTypes.SET_HAZARD_LAYER_ID: {
      if (isLayerKey(payload.layerKey)) {
        return {
          ...state,  
          hazardLayerId: payload.layerKey
        };
      }
      return state;
    }
    case ActionTypes.SET_BASELINE_LAYER_ID: {
      if (isLayerKey(payload.layerKey)) {
        return {
          ...state,  
          baselineLayerId: payload.layerKey
        };
      }
      return state;
    }
    case ActionTypes.SET_STATISTIC: { 
      return {
        ...state,  
        statistic: payload.statistic
      };
    }
    case ActionTypes.SET_SELECTED_DATE: {
      return {
        ...state,  
        selectedDate: payload.date
      };
    }
    case ActionTypes.SET_BELOW_THRESHOLD: {
      const thresholdErrorString: string | null = (state.belowThresholdValue < payload.value) ? 'Min threshold is larger than Max!' : null;
      return {
        ...state,  
        belowThreshold: payload.value,
        thresholdError: thresholdErrorString
      };
    }
    case ActionTypes.SET_ABOVE_THRESHOLD: {
      const thresholdErrorString: string | null = (payload.value < state.belowThreshold) ? 'Min threshold is larger than Max!' : null;
      return {
        ...state,  
        aboveThreshold: payload.value,
        thresholdError: thresholdErrorString
      };
    }
    default:
      return state;
  }
};

export const useAnalyserReducer = () => {
  return useReducer(analyserReducer, initForm);
};