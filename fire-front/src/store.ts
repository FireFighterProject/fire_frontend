import { configureStore } from "@reduxjs/toolkit";
import emergency from "./features/emergency/emergencySlice";
import vehicle from "./features/vehicle/vehicleSlice"; // 이미 있으시면 유지

export const store = configureStore({
    reducer: { emergency, vehicle },
});

store.subscribe(() => {
    const v = store.getState().emergency.isDisaster;
    localStorage.setItem("isDisaster", JSON.stringify(v));
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
