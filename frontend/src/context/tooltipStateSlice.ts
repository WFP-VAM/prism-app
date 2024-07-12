import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { merge } from 'lodash';
import { AdminCodeString } from 'config/types';
import type { RootState } from './store';

export interface PopupData {
  [key: string]: {
    data: number | string | null;
    coordinates: GeoJSON.Position;
  };
}

export interface PopupMetaData {
  dmpDisTyp?: string;
  dmpSubmissionId?: string;
}

export interface MapTooltipState {
  coordinates?: GeoJSON.Position;
  locationAdminCode: AdminCodeString;
  // the key under which we find locationAdminCode
  locationSelectorKey: string;
  locationName: string;
  locationLocalName: string;
  data: PopupData & PopupMetaData;
  showing: boolean;
  wmsGetFeatureInfoLoading: boolean;
}

type ShowPopupType = {
  coordinates: GeoJSON.Position;
  // the key of the dict under which locationAdminCode is to be found
  locationSelectorKey: string;
  locationAdminCode: AdminCodeString;
  locationName: string;
  locationLocalName: string;
};

const initialState: MapTooltipState = {
  locationAdminCode: '' as AdminCodeString,
  locationSelectorKey: '',
  locationName: '',
  locationLocalName: '',
  data: {},
  showing: false,
  wmsGetFeatureInfoLoading: false,
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
    }),

    setPopupData: (state, { payload }: PayloadAction<PopupData>) => ({
      ...state,
      data: payload,
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
      locationSelectorKey: payload.locationSelectorKey,
      locationAdminCode: payload.locationAdminCode,
      locationName: payload.locationName,
      locationLocalName: payload.locationLocalName,
      coordinates: payload.coordinates,
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
