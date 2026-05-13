import type { AppDispatch, RootState } from 'context/store';
import {
  useDispatch as useBaseDispatch,
  useSelector as useBaseSelector,
} from 'react-redux';

// See https://react-redux.js.org/tutorials/typescript-quick-start#define-typed-hooks
// Use these hooks throughout the app instead of plain `useDispatch` and `useSelector`
export const useDispatch = useBaseDispatch.withTypes<AppDispatch>();
export const useSelector = useBaseSelector.withTypes<RootState>();
