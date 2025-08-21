import { createSlice } from "@reduxjs/toolkit";
import type{ PayloadAction } from "@reduxjs/toolkit";

export interface EmergencyState {
    isDisaster: boolean;
}
const initialState: EmergencyState = {
    isDisaster: JSON.parse(localStorage.getItem("isDisaster") ?? "false"),
};

const emergencySlice = createSlice({
    name: "emergency",
    initialState,
    reducers: {
        setIsDisaster(state, action: PayloadAction<boolean>) {
            state.isDisaster = action.payload;
        },
        toggle(state) {
            state.isDisaster = !state.isDisaster;
        },
    },
});

export const { setIsDisaster, toggle } = emergencySlice.actions;
export default emergencySlice.reducer;
