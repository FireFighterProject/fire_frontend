import { createSlice} from "@reduxjs/toolkit";
import type{ PayloadAction } from "@reduxjs/toolkit";

import type { Vehicle } from "../../types/global";

export interface VehicleState {
    vehicles: Vehicle[];
}

const initialState: VehicleState = {
    vehicles: JSON.parse(localStorage.getItem("vehicles") ?? "[]") as Vehicle[],
};

const vehicleSlice = createSlice({
    name: "vehicle",
    initialState,
    reducers: {
        setVehicles(state, action: PayloadAction<Vehicle[]>) {
            state.vehicles = action.payload;
        },
        appendVehicles(state, action: PayloadAction<Vehicle[]>) {
            state.vehicles = [...state.vehicles, ...action.payload];
        },
        addVehicle(state, action: PayloadAction<Vehicle>) {
            state.vehicles.push(action.payload);
        },
        updateVehicle(state, action: PayloadAction<{ id: string; patch: Partial<Vehicle> }>) {
            const idx = state.vehicles.findIndex(v => v.id === action.payload.id);
            if (idx !== -1) {
                state.vehicles[idx] = { ...state.vehicles[idx], ...action.payload.patch };
            }
        },
        removeVehicle(state, action: PayloadAction<string>) {
            state.vehicles = state.vehicles.filter(v => v.id !== action.payload);
        },
        clearVehicles(state) {
            state.vehicles = [];
        },
    },
});

export const {
    setVehicles,
    appendVehicles,
    addVehicle,
    updateVehicle,
    removeVehicle,
    clearVehicles,
} = vehicleSlice.actions;

export default vehicleSlice.reducer;
