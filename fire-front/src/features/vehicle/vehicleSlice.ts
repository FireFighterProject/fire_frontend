// src/store/slices/vehicleSlice.ts
// --------------------------------------------------------
// 차량 상태 Redux 슬라이스 (axios 인스턴스 적용 버전)
// --------------------------------------------------------

import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../../store";
import type { Vehicle } from "../../types/global";
import axios from "axios";

/* ======================================================
     Redux 전용 axios 인스턴스 생성
    - baseURL: /api/vehicles
    - ManageTab에서 사용하는 axios와 분리됨
====================================================== */
const api = axios.create({
    baseURL: `/api`,
});


/* ======================================================
    백엔드 API 응답 타입
====================================================== */
type ApiVehicle = {
    avlNumber: string;
    psLteNumber: string;
    personnel: string;
    capacity: string;
    id: number;
    stationId: number;
    sido: string;
    typeName: string;
    callSign: string;
    status: number;
    rallyPoint: number;
};

/* ======================================================
    상태 코드 → UI 라벨
====================================================== */
export type VehicleStatus = "대기" | "활동" | "철수" | "집결중";

const statusCodeToLabel = (code: number): VehicleStatus => {
    if (code === 1) return "활동";
    if (code === 2) return "철수";
    if (code === 3) return "집결중";
    return "대기";
};

/* ======================================================
    localStorage 안전 파싱
====================================================== */
function loadFromLS<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

/* ======================================================
    Redux 상태 구조
====================================================== */
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

/* ======================================================
    서버 차량 조회 API 파라미터
====================================================== */
export type FetchVehiclesArgs = {
    stationId?: number | "";
    status?: number | "";
    typeName?: string;
    callSignLike?: string;
};

/* ======================================================
    API → Vehicle 매핑
====================================================== */
function mapApiToVehicle(v: ApiVehicle): Vehicle {
    return {
        id: String(v.id),
        sido: v.sido ?? "",
        stationId: v.stationId,
        type: v.typeName ?? "",
        callname: v.callSign ?? "",
        capacity: v.capacity ?? "",
        personnel: v.personnel ?? "",
        avl: v.avlNumber ?? "",
        pslte: v.psLteNumber ?? "",
        status: statusCodeToLabel(v.status),
        rally: (v.rallyPoint ?? 0) === 1,
        station: "",
    };
}


/* ======================================================
    🔥 차량 목록 조회 Thunk (axios 인스턴스 사용)
====================================================== */
export const fetchVehicles = createAsyncThunk<Vehicle[], FetchVehiclesArgs | undefined>(
    "vehicle/fetchVehicles",
    async (args, { rejectWithValue }) => {
        try {
            const params: Record<string, string | number> = {};

            if (args?.stationId) params.stationId = args.stationId;
            if (args?.status) params.status = args.status;
            if (args?.typeName) params.typeName = args.typeName;

            // 백엔드 파라미터 callSign 통일
            if (args?.callSignLike) params.callSign = args.callSignLike;

            // 백엔드 요청
            const res = await api.get<ApiVehicle[]>("/vehicles", { params });

            // 매핑
            return res.data.map(mapApiToVehicle);

        } catch (err: unknown) {
            if (axios.isAxiosError(err) && err.response) {
                return rejectWithValue(err.response.data || "차량 로드 실패");
            }
            return rejectWithValue("차량 로드 실패");
        }
    }
);


/* ======================================================
    Slice 본체
====================================================== */
const vehicleSlice = createSlice({
    name: "vehicle",
    initialState,
    reducers: {
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
            if (idx !== -1) Object.assign(state.vehicles[idx], action.payload.patch);
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

        updateStatus(state, action: PayloadAction<{ id: string; status: VehicleStatus }>) {
            const t = state.vehicles.find(v => v.id === action.payload.id);
            if (t) t.status = action.payload.status;
            localStorage.setItem("vehicles", JSON.stringify(state.vehicles));
        },

        bulkUpdateStatus(state, action: PayloadAction<{ ids: string[]; status: VehicleStatus }>) {
            const { ids, status } = action.payload;
            state.vehicles.forEach(v => {
                if (ids.includes(String(v.id))) v.status = status;
            });
            localStorage.setItem("vehicles", JSON.stringify(state.vehicles));
        },

        relocate(state, action: PayloadAction<{ id: string; dispatchPlace?: string; lat?: number; lng?: number }>) {
            const t = state.vehicles.find(v => v.id === action.payload.id);
            if (t) Object.assign(t, action.payload);
            localStorage.setItem("vehicles", JSON.stringify(state.vehicles));
        },

        toggleRally(state, action: PayloadAction<{ id: string; rally: boolean }>) {
            const t = state.vehicles.find(v => v.id === action.payload.id);
            if (t) t.rally = action.payload.rally;
            localStorage.setItem("vehicles", JSON.stringify(state.vehicles));
        },

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
                    localStorage.setItem("vehicles", JSON.stringify(state.vehicles));
                    state.lastSavedAt = new Date().toISOString();
                })
                .addCase(fetchVehicles.rejected, (state, action) => {
                    state.loading = false;
                    state.error = action.error.message ?? "로드 실패";
                    state.vehicles = [];   //  캐시 삭제
                });
        },
});

export default vehicleSlice.reducer;

/* 액션 export */
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

/* 셀렉터 */
export const selectVehicleState = (s: RootState) => s.vehicle;
export const selectVehicles = (s: RootState) => s.vehicle.vehicles;
export const selectSelectedIds = (s: RootState) => s.vehicle.selectedIds;
export const selectFilters = (s: RootState) => s.vehicle.filters;

/* 필터된 리스트 */
export const selectFilteredVehicles = createSelector(
    [selectVehicles, selectFilters],
    (items, f) =>
        items.filter(v =>
            (!f.sido || v.sido === f.sido) &&
            (!f.type || v.type === f.type) &&
            (!f.status || v.status === f.status)
        )
);

/* 활동 차량 */
export const selectActiveVehicles = createSelector([selectVehicles], (items) =>
    items.filter(v => v.status === "활동")
);

/* 상태별 개수 */
export const selectStatusCounts = createSelector([selectVehicles], (items) => {
    const counts: Record<VehicleStatus, number> = {
        대기: 0,
        활동: 0,
        철수: 0,
    };
    for (const v of items) counts[v.status as VehicleStatus]++;
    return counts;
});

/* ID 기반 조회 */
export const selectVehicleById =
    (id: string) => (s: RootState) =>
        s.vehicle.vehicles.find(v => v.id === id);
