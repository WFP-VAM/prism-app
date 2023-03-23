import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { merge } from 'lodash';
import type { RootState } from './store';

export interface PopupData {
  [key: string]: {
    data: number | string;
    coordinates: GeoJSON.Position;
    adminLevel?: number;
    date?: string;
  };
}

export interface MapTooltipState {
  coordinates?: GeoJSON.Position;
  locationName: string;
  locationLocalName: string;
  data: PopupData;
  showing: boolean;
  wmsGetFeatureInfoLoading: boolean;
  date: string;
}

type ShowPopupType = {
  coordinates: GeoJSON.Position;
  locationName: string;
  locationLocalName: string;
  date: string;
};

const initialState: MapTooltipState = {
  locationName: '',
  locationLocalName: '',
  data: {},
  showing: false,
  wmsGetFeatureInfoLoading: false,
  date: '',
};

export const tooltipStateSlice = createSlice({
  name: 'tooltipState',
  initialState,
  reducers: {
    addPopupData: (
      { data, ...rest },
      { payload }: PayloadAction<PopupData>,
    ) => ({
      ...rest,
      data: merge({}, data, payload),
      date: '2023',
    }),

    setPopupData: (state, { payload }: PayloadAction<PopupData>) => ({
      ...state,
      data: payload,
      date: '2023',
    }),

    setPopupShowing: (state, { payload }: PayloadAction<boolean>) => ({
      ...state,
      showing: payload,
    }),

    hidePopup: state => ({
      ...state,
      showing: false,
      data: {},
    }),

    showPopup: (state, { payload }: PayloadAction<ShowPopupType>) => ({
      ...state,
      showing: true,
      locationName: payload.locationName,
      locationLocalName: payload.locationLocalName,
      coordinates: payload.coordinates,
      date: `2023`,
    }),

    setPopupCoordinates: (
      state,
      { payload }: PayloadAction<GeoJSON.Position>,
    ) => ({
      ...state,
      coordinates: payload,
    }),

    setWMSGetFeatureInfoLoading: (
      state,
      { payload }: PayloadAction<boolean>,
    ) => ({
      ...state,
      wmsGetFeatureInfoLoading: payload,
    }),
  },
});

// Getters
export const tooltipSelector = (state: RootState): MapTooltipState =>
  state.tooltipState;
export const tooltipShowingSelector = (
  state: RootState,
): MapTooltipState['showing'] => state.tooltipState.showing;

// Setters
export const {
  addPopupData,
  setPopupData,
  setPopupShowing,
  hidePopup,
  showPopup,
  setPopupCoordinates,
  setWMSGetFeatureInfoLoading,
} = tooltipStateSlice.actions;

export default tooltipStateSlice.reducer;
