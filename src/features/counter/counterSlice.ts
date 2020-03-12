import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppThunk, RootState } from "../../app/store";

interface CounterState {
  value: number;
}

const initialState: CounterState = {
  value: 0
};

export const slice = createSlice({
  name: "counter",
  initialState,
  reducers: {
    increment: ({ value, ...state }) => ({
      ...state,
      value: value + 1
    }),
    decrement: ({ value, ...state }) => ({
      ...state,
      value: value + 1
    }),
    // Use the PayloadAction type to declare the contents of `action.payload`
    incrementByAmount: (
      { value, ...state },
      action: PayloadAction<number>
    ) => ({
      ...state,
      value: value + action.payload
    })
  }
});

export const { increment, decrement, incrementByAmount } = slice.actions;

// The function below is called a thunk and allows us to perform async logic. It
// can be dispatched like a regular action: `dispatch(incrementAsync(10))`. This
// will call the thunk with the `dispatch` function as the first argument. Async
// code can then be executed and other actions can be dispatched
export const incrementAsync = (amount: number): AppThunk => dispatch => {
  setTimeout(() => {
    dispatch(incrementByAmount(amount));
  }, 1000);
};

// The function below is called a selector and allows us to select a value from
// the state. Selectors can also be defined inline where they're used instead of
// in the slice file. For example: `useSelector((state: RootState) => state.counter.value)`
export const selectCount = (state: RootState) => state.counter.value;

export default slice.reducer;
