// src/pages/ManageTab.tsx
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
    import type { FilterQuery } from "../Status/manage/FilterBar";

import { fetchVehicles, selectVehicles } from "../../features/vehicle/vehicleSlice";

import FilterBar from "../Status/manage/FilterBar";
import VehicleTable from "../Status/manage/VehicleTable";

import type { FireStation } from "../../types/station";
import type { Vehicle } from "../../types/vehicle";

const API_BASE = "/api";


export default function ManageTab() {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dispatch = useDispatch<any>();
    const vehicles = useSelector(selectVehicles) as Vehicle[];

    const [loading, setLoading] = useState(false);

    // 🔥 소방서 목록
    const [allStations, setAllStations] = useState<FireStation[]>([]);

    // 🔥 필터

    const [query, setQuery] = useState<FilterQuery>({
        sido: "",
        stationId: "",   // string 유지
        status: "",
        typeName: "",
        callSign: "",
    });


    // ========================================================
    // 1) 소방서 전체 로드
    // ========================================================
    useEffect(() => {
        axios
            .get(`${API_BASE}/fire-stations`)
            .then((res) => setAllStations(res.data))
            .catch((e) => console.error("❌ fire-stations 요청 실패:", e));
    }, []);

    // ========================================================
    // 2) 차량 전체 로드
    // ========================================================
    useEffect(() => {
        setLoading(true);
        dispatch(fetchVehicles({})).finally(() => setLoading(false));
    }, [dispatch]);

    // ========================================================
    // 3) 필터링
    // ========================================================
    const filteredRows = useMemo(() => {
        let list = vehicles.map((v) => {
            const station = allStations.find(
                (s) => Number(s.id) === Number(v.stationId)
            );

            return {
                id: v.id,
                stationId: v.stationId,
                sido: v.sido,
                station: station?.name ?? "-",
                type: v.type,
                callname: v.callname,
                capacity: v.capacity,
                personnel: v.personnel,
                avl: v.avl,
                pslte: v.pslte,
                status: v.status,
                rally: v.rally,
            };
        });

        if (query.sido) {
            list = list.filter((r) => r.sido === query.sido);
        }

        if (query.stationId) {
            list = list.filter(
                (r) => Number(r.stationId) === Number(query.stationId)
            );
        }

        if (query.status !== "") {
            list = list.filter((r) => String(r.status) === String(query.status));
        }

        if (query.typeName.trim() !== "") {
            const t = query.typeName.trim().toLowerCase();
            list = list.filter((r) => r.type.toLowerCase().includes(t));
        }

        if (query.callSign.trim() !== "") {
            const c = query.callSign.trim().toLowerCase();
            list = list.filter((r) => r.callname.toLowerCase().includes(c));
        }

        return list;
    }, [vehicles, allStations, query]);

    // ========================================================
    // 4) PATCH 요청
    // ========================================================
    const patchVehicle = async (id: string | number, patch: Partial<Vehicle>) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload: any = {};

        if (patch.callname !== undefined) payload.callSign = patch.callname;
        if (patch.type !== undefined) payload.typeName = patch.type;
        if (patch.capacity !== undefined)
            payload.capacity = Number(patch.capacity);
        if (patch.personnel !== undefined)
            payload.personnel = Number(patch.personnel);
        if (patch.avl !== undefined) payload.avlNumber = patch.avl;
        if (patch.pslte !== undefined) payload.psLteNumber = patch.pslte;
        if (patch.rally !== undefined) payload.rallyPoint = patch.rally ? 1 : 0;

        return axios.patch(`${API_BASE}/api/vehicles/${id}`, payload);
    };

    // ========================================================
    // 5) 수정 UI 상태
    // ========================================================
    const [editRowId, setEditRowId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<Vehicle>>({});

    const saveEdit = async () => {
        if (!editRowId) return;

        try {
            await patchVehicle(editRowId, editData);
            dispatch(fetchVehicles({}));
            alert("수정 완료");
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err) {
            alert("수정 실패");
        }

        setEditRowId(null);
        setEditData({});
    };

    return (
        <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">등록 차량 리스트</h3>

            <FilterBar
                rows={filteredRows}
                query={query}
                setQuery={setQuery}
                allStations={allStations}
            />

            <VehicleTable
                rows={filteredRows}
                loading={loading}
                editRowId={editRowId}
                editData={editData}
                setEditData={setEditData}
                setEditRowId={setEditRowId}
                saveEdit={saveEdit}
                allStations={allStations}
            />
        </div>
    );  
}
