import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../../store";
import type { Vehicle } from "../../types/global";
import { fetchVehiclesMapped } from "../../api/vehicles";
import type { FetchVehiclesParams } from "../../api/types";
import { statusCodeToLabel } from "../../services/mappers/vehicleMapper";

export type VehicleStatus = "대기" | "활동" | "철수" | "집결중";

function loadFromLS<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

export interface VehicleState {
    vehicles: Vehicle[];
    loading: boolean;
    error: string | null;
    selectedIds: string[];
    filters: {
        sido?: string;
        type?: string;
        status?: VehicleStatus | "";
    };
    lastSavedAt?: string;
}

const initialState: VehicleState = {
    vehicles: loadFromLS<Vehicle[]>("vehicles", []),
    loading: false,
    error: null,
    selectedIds: [],
    filters: { sido: undefined, type: undefined, status: "" },
    lastSavedAt: undefined,
};

export type FetchVehiclesArgs = FetchVehiclesParams;

export const fetchVehicles = createAsyncThunk<Vehicle[], FetchVehiclesArgs | undefined>(
    "vehicle/fetchVehicles",
    async (args, { rejectWithValue }) => {
        try {
            return await fetchVehiclesMapped(args);
        } catch (err: unknown) {
            const message =
                err && typeof err === "object" && "message" in err
                    ? String((err as { message: string }).message)
                    : "차량 로드 실패";
            return rejectWithValue(message);
        }
    }
);

const vehicleSlice = createSlice({
    name: "vehicle",
    initialState,
    reducers: {
        setVehicles(state, action: PayloadAction<Vehicle[]>) {
            state.vehicles = action.payload;
            state.lastSavedAt = new Date().toISOString();
        },

        appendVehicles(state, action: PayloadAction<Vehicle[]>) {
            state.vehicles = [...state.vehicles, ...action.payload];
            state.lastSavedAt = new Date().toISOString();
        },

        upsertMany(state, action: PayloadAction<Vehicle[]>) {
            const byId = new Map(state.vehicles.map((v) => [v.id, v]));
            for (const nv of action.payload) {
                const cur = byId.get(nv.id);
                if (cur) Object.assign(cur, nv);
                else state.vehicles.push(nv);
            }
            state.lastSavedAt = new Date().toISOString();
        },

        addVehicle(state, action: PayloadAction<Vehicle>) {
            state.vehicles.push(action.payload);
            state.lastSavedAt = new Date().toISOString();
        },

        updateVehicle(state, action: PayloadAction<{ id: string; patch: Partial<Vehicle> }>) {
            const idx = state.vehicles.findIndex((v) => v.id === action.payload.id);
            if (idx !== -1) Object.assign(state.vehicles[idx], action.payload.patch);
            state.lastSavedAt = new Date().toISOString();
        },

        removeVehicle(state, action: PayloadAction<string>) {
            state.vehicles = state.vehicles.filter((v) => v.id !== action.payload);
            state.selectedIds = state.selectedIds.filter((id) => id !== action.payload);
            state.lastSavedAt = new Date().toISOString();
        },

        clearVehicles(state) {
            state.vehicles = [];
            state.selectedIds = [];
            state.lastSavedAt = new Date().toISOString();
        },

        updateStatus(state, action: PayloadAction<{ id: string; status: VehicleStatus }>) {
            const t = state.vehicles.find((v) => v.id === action.payload.id);
            if (t) t.status = action.payload.status;
        },

        bulkUpdateStatus(state, action: PayloadAction<{ ids: string[]; status: VehicleStatus }>) {
            const { ids, status } = action.payload;
            state.vehicles.forEach((v) => {
                if (ids.includes(String(v.id))) v.status = status;
            });
        },

        relocate(
            state,
            action: PayloadAction<{ id: string; dispatchPlace?: string; lat?: number; lng?: number }>
        ) {
            const t = state.vehicles.find((v) => v.id === action.payload.id);
            if (t) Object.assign(t, action.payload);
        },

        toggleRally(state, action: PayloadAction<{ id: string; rally: boolean }>) {
            const t = state.vehicles.find((v) => v.id === action.payload.id);
            if (t) t.rally = action.payload.rally;
        },

        toggleSelect(state, action: PayloadAction<string>) {
            const id = action.payload;
            state.selectedIds = state.selectedIds.includes(id)
                ? state.selectedIds.filter((x) => x !== id)
                : [...state.selectedIds, id];
        },

        setSelected(state, action: PayloadAction<string[]>) {
            state.selectedIds = action.payload;
        },

        clearSelection(state) {
            state.selectedIds = [];
        },

        setFilters(state, action: PayloadAction<Partial<VehicleState["filters"]>>) {
            state.filters = { ...state.filters, ...action.payload };
        },

        resetFilters(state) {
            state.filters = { sido: undefined, type: undefined, status: "" };
        },

        markSaved(state) {
            state.lastSavedAt = new Date().toISOString();
        },
        setLoading(state, action: PayloadAction<boolean>) {
            state.loading = action.payload;
        },
        setError(state, action: PayloadAction<string | null>) {
            state.error = action.payload;
        },
    },

    extraReducers: (builder) => {
        builder
            .addCase(fetchVehicles.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchVehicles.fulfilled, (state, action) => {
                state.loading = false;
                state.vehicles = action.payload;
                state.lastSavedAt = new Date().toISOString();
            })
            .addCase(fetchVehicles.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message ?? "로드 실패";
                state.vehicles = [];
            });
    },
});

export default vehicleSlice.reducer;

export const {
    setVehicles,
    appendVehicles,
    upsertMany,
    addVehicle,
    updateVehicle,
    removeVehicle,
    clearVehicles,
    updateStatus,
    bulkUpdateStatus,
    relocate,
    toggleRally,
    toggleSelect,
    setSelected,
    clearSelection,
    setFilters,
    resetFilters,
    markSaved,
    setLoading,
    setError,
} = vehicleSlice.actions;

export { statusCodeToLabel };

export const selectVehicleState = (s: RootState) => s.vehicle;
export const selectVehicles = (s: RootState) => s.vehicle.vehicles;
export const selectSelectedIds = (s: RootState) => s.vehicle.selectedIds;
export const selectFilters = (s: RootState) => s.vehicle.filters;

export const selectFilteredVehicles = createSelector(
    [selectVehicles, selectFilters],
    (items, f) =>
        items.filter(
            (v) =>
                (!f.sido || v.sido === f.sido) &&
                (!f.type || v.type === f.type) &&
                (!f.status || v.status === f.status)
        )
);

export const selectActiveVehicles = createSelector([selectVehicles], (items) =>
    items.filter((v) => v.status === "활동" || v.status === "출동중")
);

export const selectStatusCounts = createSelector([selectVehicles], (items) => {
    const counts: Record<VehicleStatus, number> = {
        대기: 0,
        활동: 0,
        철수: 0,
        집결중: 0,
    };
    for (const v of items) {
        const key = v.status as VehicleStatus;
        if (key in counts) counts[key]++;
        else if (v.status === "출동중") counts.활동++;
    }
    return counts;
});

export const selectVehicleById = (id: string) => (s: RootState) =>
    s.vehicle.vehicles.find((v) => v.id === id);
