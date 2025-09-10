import { configureStore } from "@reduxjs/toolkit";
import emergency from "./features/emergency/emergencySlice";
import vehicleReducer, { markSaved } from "./features/vehicle/vehicleSlice";


export const store = configureStore({
    reducer: {
        emergency,
        vehicle: vehicleReducer, },
});

store.subscribe(() => {
    const v = store.getState().emergency.isDisaster;
    localStorage.setItem("isDisaster", JSON.stringify(v));
});
// ✅ vehicles 변경 시 localStorage 자동 저장
let prev = JSON.stringify(store.getState().vehicle.vehicles);
store.subscribe(() => {
    const cur = JSON.stringify(store.getState().vehicle.vehicles);
    if (cur !== prev) {
        prev = cur;
        localStorage.setItem("vehicles", cur);
        store.dispatch(markSaved());
    }
});
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
