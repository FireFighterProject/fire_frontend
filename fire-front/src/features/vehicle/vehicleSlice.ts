// src/store/slices/vehicleSlice.ts
// 차량 슬라이스 (API 연동판)
// - 초기 로드: localStorage → 없으면 []
// - 비동기: GET /api/vehicles?stationId=&status=&typeName=&callSignLike=
// - API → 앱 Vehicle 타입으로 매핑

import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../../store";
import type { Vehicle } from "../../types/global";
import axios from "axios";

/** 백엔드 응답 타입 */
type ApiVehicle = {
    id: number;
    stationId: number;
    sido: string;
    typeName: string;
    callSign: string;
    status: number;     // 0:대기, 1:활동, 2:철수 (가정)
    rallyPoint: number; // 0/1
};

/** 앱 내 상태 라벨 */
export type VehicleStatus = "대기" | "활동" | "대기중" | "출동중" | "복귀" | "철수";

/** 코드 ↔ 라벨 */
const statusCodeToLabel = (code: number): VehicleStatus => {
    if (code === 1) return "활동";
    if (code === 2) return "철수";
    return "대기";
};

const API_BASE = "http://172.28.2.191:8081";

/** 안전 파서 */
function loadFromLS<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return parsed as T;
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

const initialState: VehicleState = {
    vehicles: loadFromLS<Vehicle[]>("vehicles", []), // ✅ 더미 대신 빈 배열
    loading: false,
    error: null,
    selectedIds: [],
    filters: { sido: undefined, type: undefined, status: "" },
    lastSavedAt: undefined,
};

/** 쿼리 파라미터 */
export type FetchVehiclesArgs = {
    stationId?: number | "";
    status?: number | "";     // 백엔드 코드 값
    typeName?: string;
    callSignLike?: string;
};

/** API → Vehicle 매핑 (앱 Vehicle 타입에 맞춰 필요 시 수정) */
// 기존
function mapApiToVehicle(v: ApiVehicle): Vehicle {
    return {
        id: String(v.id),
        sido: v.sido ?? "",
        station: "",               // API 미제공 → ""
        type: v.typeName ?? "",
        callname: v.callSign ?? "",
        capacity: 0,               // ✅ number 기본값
        personnel: 0,              // ✅ number 기본값
        avl: "",                   // ✅ string 기본값
        pslte: "",                 // ✅ string 기본값
        status: statusCodeToLabel(v.status),  // ✅ VehicleStatus
        rally: (v.rallyPoint ?? 0) === 1,
    };
}


/* --------------------------- 비동기: 서버 목록 조회 --------------------------- */
export const fetchVehicles = createAsyncThunk<Vehicle[], FetchVehiclesArgs | undefined>(
    "vehicle/fetchAll",
    async (args) => {
        const params: Record<string, any> = {};
        if (args?.stationId !== "" && args?.stationId != null) params.stationId = args.stationId;
        if (args?.status !== "" && args?.status != null) params.status = args.status;
        if (args?.typeName) params.typeName = args.typeName;
        if (args?.callSignLike) params.callSignLike = args.callSignLike;

        const res = await axios.get<ApiVehicle[]>(`${API_BASE}/api/vehicles`, { params });
        return res.data.map(mapApiToVehicle);
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
            localStorage.setItem("vehicles", JSON.stringify(state.vehicles));
            state.lastSavedAt = new Date().toISOString();
        },
        appendVehicles(state, action: PayloadAction<Vehicle[]>) {
            state.vehicles = [...state.vehicles, ...action.payload];
            localStorage.setItem("vehicles", JSON.stringify(state.vehicles));
            state.lastSavedAt = new Date().toISOString();
        },
        upsertMany(state, action: PayloadAction<Vehicle[]>) {
            const byId = new Map(state.vehicles.map(v => [v.id, v]));
            for (const nv of action.payload) {
                const cur = byId.get(nv.id);
                if (cur) Object.assign(cur, nv);
                else state.vehicles.push(nv);
            }
            localStorage.setItem("vehicles", JSON.stringify(state.vehicles));
            state.lastSavedAt = new Date().toISOString();
        },
        addVehicle(state, action: PayloadAction<Vehicle>) {
            state.vehicles.push(action.payload);
            localStorage.setItem("vehicles", JSON.stringify(state.vehicles));
            state.lastSavedAt = new Date().toISOString();
        },
        updateVehicle(state, action: PayloadAction<{ id: string; patch: Partial<Vehicle> }>) {
            const idx = state.vehicles.findIndex(v => v.id === action.payload.id);
            if (idx !== -1) state.vehicles[idx] = { ...state.vehicles[idx], ...action.payload.patch };
            localStorage.setItem("vehicles", JSON.stringify(state.vehicles));
            state.lastSavedAt = new Date().toISOString();
        },
        removeVehicle(state, action: PayloadAction<string>) {
            state.vehicles = state.vehicles.filter(v => v.id !== action.payload);
            state.selectedIds = state.selectedIds.filter(id => id !== action.payload);
            localStorage.setItem("vehicles", JSON.stringify(state.vehicles));
            state.lastSavedAt = new Date().toISOString();
        },
        clearVehicles(state) {
            state.vehicles = [];
            state.selectedIds = [];
            localStorage.setItem("vehicles", JSON.stringify(state.vehicles));
            state.lastSavedAt = new Date().toISOString();
        },

        /* ========== 업무 액션 ========== */
        updateStatus(state, action: PayloadAction<{ id: string; status: VehicleStatus }>) {
            const t = state.vehicles.find(v => v.id === action.payload.id);
            if (t) t.status = action.payload.status as any;
            localStorage.setItem("vehicles", JSON.stringify(state.vehicles));
            state.lastSavedAt = new Date().toISOString();
        },
        bulkUpdateStatus(state, action: PayloadAction<{ ids: string[]; status: VehicleStatus }>) {
            const { ids, status } = action.payload;
            state.vehicles.forEach(v => { if (ids.includes(v.id)) v.status = status as any; });
            localStorage.setItem("vehicles", JSON.stringify(state.vehicles));
            state.lastSavedAt = new Date().toISOString();
        },
        relocate(state, action: PayloadAction<{ id: string; dispatchPlace?: string; lat?: number; lng?: number }>) {
            const t = state.vehicles.find(v => v.id === action.payload.id);
            if (t) Object.assign(t, action.payload);
            localStorage.setItem("vehicles", JSON.stringify(state.vehicles));
            state.lastSavedAt = new Date().toISOString();
        },
        toggleRally(state, action: PayloadAction<{ id: string; rally: boolean }>) {
            const t = state.vehicles.find(v => v.id === action.payload.id);
            if (t) t.rally = action.payload.rally;
            localStorage.setItem("vehicles", JSON.stringify(state.vehicles));
            state.lastSavedAt = new Date().toISOString();
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
                localStorage.setItem("vehicles", JSON.stringify(state.vehicles));
                state.lastSavedAt = new Date().toISOString();
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
    const counts: Record<VehicleStatus, number> = { 대기: 0, 활동: 0, 대기중: 0, 출동중: 0, 복귀: 0, 철수: 0 };
    for (const v of items) {
        if (v.status && counts[v.status as VehicleStatus] !== undefined) counts[v.status as VehicleStatus]++;
    }
    return counts;
});

export const selectVehicleById =
    (id: string) => (s: RootState) => s.vehicle.vehicles.find(v => v.id === id);
