import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from 'context/store';

// See https://react-redux.js.org/tutorials/typescript-quick-start#define-typed-hooks
// Use these hooks throughout the app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
