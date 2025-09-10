// 차량 슬라이스 (강화판)
// - 초기 로드: localStorage → 없으면 DUMMY_VEHICLES
// - UI 상태/필터/비동기 + 셀렉터 포함

import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../../store";
import type { Vehicle } from "../../types/global";
import { DUMMY_VEHICLES } from "../../data/vehicles"; // ✅ 추가

/** 차량 상태 타입 (공통으로 쓰면 global.ts에 둬도 됨) */
export type VehicleStatus = "대기" | "활동" | "대기중" | "출동중" | "복귀";

/** 안전 파서 */
function loadFromLS<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return Array.isArray(fallback) && !Array.isArray(parsed) ? fallback : (parsed as T);
    } catch {
        return fallback;
    }
}

/** 슬라이스 상태 */
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

/** 초기값: LS → 없으면 더미 */
const initialState: VehicleState = {
    vehicles: loadFromLS<Vehicle[]>("vehicles", DUMMY_VEHICLES), // ✅ 핵심
    loading: false,
    error: null,
    selectedIds: [],
    filters: { sido: undefined, type: undefined, status: "" },
    lastSavedAt: undefined,
};

/* ------------------------------- 비동기 예시 ------------------------------- */
export const fetchVehicles = createAsyncThunk<Vehicle[]>(
    "vehicle/fetchAll",
    async () => {
        // 실제 API 연결 시 교체
        return DUMMY_VEHICLES; // 데모 기본
    }
);

/* --------------------------------- 슬라이스 -------------------------------- */
const vehicleSlice = createSlice({
    name: "vehicle",
    initialState,
    reducers: {
        /* ========== CRUD ========== */
        setVehicles(state, action: PayloadAction<Vehicle[]>) {
            state.vehicles = action.payload;
        },
        appendVehicles(state, action: PayloadAction<Vehicle[]>) {
            state.vehicles = [...state.vehicles, ...action.payload];
        },
        upsertMany(state, action: PayloadAction<Vehicle[]>) {
            const byId = new Map(state.vehicles.map(v => [v.id, v]));
            for (const nv of action.payload) {
                const cur = byId.get(nv.id);
                if (cur) Object.assign(cur, nv);
                else state.vehicles.push(nv);
            }
        },
        addVehicle(state, action: PayloadAction<Vehicle>) {
            state.vehicles.push(action.payload);
        },
        updateVehicle(state, action: PayloadAction<{ id: string; patch: Partial<Vehicle> }>) {
            const idx = state.vehicles.findIndex(v => v.id === action.payload.id);
            if (idx !== -1) state.vehicles[idx] = { ...state.vehicles[idx], ...action.payload.patch };
        },
        removeVehicle(state, action: PayloadAction<string>) {
            state.vehicles = state.vehicles.filter(v => v.id !== action.payload);
            state.selectedIds = state.selectedIds.filter(id => id !== action.payload);
        },
        clearVehicles(state) {
            state.vehicles = [];
            state.selectedIds = [];
        },

        /* ========== 업무 액션 ========== */
        updateStatus(state, action: PayloadAction<{ id: string; status: VehicleStatus }>) {
            const t = state.vehicles.find(v => v.id === action.payload.id);
            if (t) t.status = action.payload.status as any;
        },
        bulkUpdateStatus(state, action: PayloadAction<{ ids: string[]; status: VehicleStatus }>) {
            const { ids, status } = action.payload;
            state.vehicles.forEach(v => { if (ids.includes(v.id)) v.status = status as any; });
        },
        relocate(state, action: PayloadAction<{ id: string; dispatchPlace?: string; lat?: number; lng?: number }>) {
            const t = state.vehicles.find(v => v.id === action.payload.id);
            if (t) Object.assign(t, action.payload);
        },
        toggleRally(state, action: PayloadAction<{ id: string; rally: boolean }>) {
            const t = state.vehicles.find(v => v.id === action.payload.id);
            if (t) t.rally = action.payload.rally;
        },

        /* ========== 선택/필터 ========== */
        toggleSelect(state, action: PayloadAction<string>) {
            const id = action.payload;
            state.selectedIds = state.selectedIds.includes(id)
                ? state.selectedIds.filter(x => x !== id)
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

        /* ========== 메타 ========== */
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
                state.loading = true; state.error = null;
            })
            .addCase(fetchVehicles.fulfilled, (state, action) => {
                state.loading = false; state.vehicles = action.payload;
            })
            .addCase(fetchVehicles.rejected, (state, action) => {
                state.loading = false; state.error = action.error.message ?? "로드 실패";
            });
    },
});

export default vehicleSlice.reducer;

/* ------------------------------- 액션 export ------------------------------- */
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

/* -------------------------------- 셀렉터들 -------------------------------- */
export const selectVehicleState = (s: RootState) => s.vehicle;
export const selectVehicles = (s: RootState) => s.vehicle.vehicles;
export const selectSelectedIds = (s: RootState) => s.vehicle.selectedIds;
export const selectFilters = (s: RootState) => s.vehicle.filters;

export const selectFilteredVehicles = createSelector(
    [selectVehicles, selectFilters],
    (items, f) =>
        items.filter(v =>
            (!f.sido || v.sido === f.sido) &&
            (!f.type || v.type === f.type) &&
            (!f.status || v.status === f.status)
        )
);

export const selectActiveVehicles = createSelector([selectVehicles], (items) =>
    items.filter(v => v.status === "활동" || v.status === "출동중")
);

export const selectStatusCounts = createSelector([selectVehicles], (items) => {
    const counts: Record<VehicleStatus, number> = { 대기: 0, 활동: 0, 대기중: 0, 출동중: 0, 복귀: 0 };
    for (const v of items) {
        if (v.status && counts[v.status as VehicleStatus] !== undefined) counts[v.status as VehicleStatus]++;
    }
    return counts;
});

export const selectVehicleById =
    (id: string) => (s: RootState) => s.vehicle.vehicles.find(v => v.id === id);
