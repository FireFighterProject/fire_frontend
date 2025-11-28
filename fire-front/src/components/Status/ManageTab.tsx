// src/pages/ManageTab.tsx
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";

import { fetchVehicles, selectVehicles } from "../../features/vehicle/vehicleSlice";

import FilterBar from "../Status/manage/FilterBar";
import VehicleTable from "../Status/manage/VehicleTable";

const API_BASE = "http://172.28.5.94:8081";

export default function ManageTab() {

    const dispatch = useDispatch<any>();
    const vehicles = useSelector(selectVehicles); // 전체 차량

    const [loading, setLoading] = useState(false);
    const [allStations, setAllStations] = useState<any[]>([]);

    const [query, setQuery] = useState({
        sido: "",
        stationId: "",
        status: "",
        typeName: "",
        callSign: "",
    });

    // 🔥 1) 소방서 전체 로드
    useEffect(() => {
        axios.get(`${API_BASE}/api/fire-stations`)
            .then((res) => setAllStations(res.data))
            .catch((e) => console.error("❌ fire-stations 요청 실패:", e));
    }, []);

    // 🔥 2) 차량 전체 로드 (서버는 전체만 조회)
    useEffect(() => {
        setLoading(true);
        dispatch(fetchVehicles({}))  // 조건 없이 전체 조회
            .finally(() => setLoading(false));
    }, []);


    // ----------------------------------------------------------
    // 🔥 3) 프론트 전용 필터링 (서버 NO 필터)
    // ----------------------------------------------------------

    const filteredRows = useMemo(() => {
        let list = vehicles.map((v: any) => {
            const station = allStations.find(
                (s: any) => Number(s.id) === Number(v.stationId)
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

        // 🌟 시도 필터
        if (query.sido) {
            list = list.filter((r) => r.sido === query.sido);
        }

        // 🌟 소방서 필터
        if (query.stationId) {
            list = list.filter((r) => Number(r.stationId) === Number(query.stationId));
        }

        // 🌟 상태 필터
        if (query.status !== "") {
            list = list.filter((r) => String(r.status) === String(query.status));
        }

        // 🌟 차종
        if (query.typeName.trim() !== "") {
            const t = query.typeName.trim().toLowerCase();
            list = list.filter((r) => r.type.toLowerCase().includes(t));
        }

        // 🌟 호출명
        if (query.callSign.trim() !== "") {
            const c = query.callSign.trim().toLowerCase();
            list = list.filter((r) => r.callname.toLowerCase().includes(c));
        }

        return list;

    }, [vehicles, allStations, query]);


    // ----------------------------------------------------------
    // 4) 테이블 수정 기능
    // ----------------------------------------------------------
    const patchVehicle = async (id: string, patch: any) => {
        const payload: any = {};

        if (patch.callname !== undefined) payload.callSign = patch.callname;
        if (patch.type !== undefined) payload.typeName = patch.type;
        if (patch.capacity !== undefined) payload.capacity = Number(patch.capacity);
        if (patch.personnel !== undefined) payload.personnel = Number(patch.personnel);
        if (patch.avl !== undefined) payload.avlNumber = patch.avl;
        if (patch.pslte !== undefined) payload.psLteNumber = patch.pslte;
        if (patch.rally !== undefined) payload.rallyPoint = patch.rally ? 1 : 0;

        await axios.patch(`${API_BASE}/api/vehicles/${id}`, payload);
    };


    const [editRowId, setEditRowId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>({});

    const saveEdit = async () => {
        if (!editRowId) return;

        try {
            await patchVehicle(editRowId, editData);
            dispatch(fetchVehicles({}));  // 다시 전체 로드
            alert("수정 완료");
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
