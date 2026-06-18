// src/pages/ManageTab.tsx
import { useEffect, useState, useMemo } from "react";
import apiClient from "../../api/axios";
import { fetchAllGps } from "../../api/gps";
import { fetchAllFireStations } from "../../api/stations";
import { useAppDispatch, useAppSelector } from "../../hooks";
import type { FilterQuery } from "../Status/manage/FilterBar";

import { fetchVehicles, selectVehicles } from "../../features/vehicle/vehicleSlice";
import { useVehiclePolling } from "../../hooks/useVehiclePolling";
import { matchesStatusFilter } from "../../services/vehicle/status";

import FilterBar from "../Status/manage/FilterBar";
import VehicleTable from "../Status/manage/VehicleTable";

import type { FireStation } from "../../types/station";
import type { Vehicle } from "../../types/vehicle";

export default function ManageTab() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dispatch = useAppDispatch();
    const vehicles = useAppSelector(selectVehicles) as Vehicle[];
    const loading = useAppSelector((s) => s.vehicle.loading);

    //  소방서 목록
    const [allStations, setAllStations] = useState<FireStation[]>([]);

    //  GPS 수신 차량 id 목록
    const [gpsActiveIds, setGpsActiveIds] = useState<number[]>([]);

    //  필터
    const [query, setQuery] = useState<FilterQuery>({
        sido: "",
        stationId: "",
        status: "",
        typeName: "",
        callSign: "",
    });

    // ========================================================
    // 1) 소방서 전체 로드
    // ========================================================
    useEffect(() => {
        fetchAllFireStations()
            .then(setAllStations)
            .catch((e) => console.error("fire-stations 요청 실패:", e));
    }, []);

    // ========================================================
    // 2) 차량 전체 로드 + 15초마다 자동 갱신
    // ========================================================
    useVehiclePolling();

    // ========================================================
    // 3) GPS 수신 차량 id 로드 (/api/gps/all) + 20초마다 폴링
    // ========================================================
    useEffect(() => {
        let cancelled = false;

        const fetchGpsActiveIds = async () => {
            try {
                const data = await fetchAllGps();
                if (cancelled) return;
                setGpsActiveIds(data.map((g) => Number(g.vehicleId)));
            } catch (e) {
                console.error("gps/all 요청 실패:", e);
            }
        };

        // 처음 마운트될 때 한 번 즉시 호출
        fetchGpsActiveIds();

        // 20초마다 한 번씩 재요청
        const intervalId = window.setInterval(fetchGpsActiveIds, 20000);

        // 언마운트 시 인터벌 정리
        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, []);

    // ========================================================
    // 4) 필터링
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
                personnel: v.personnel,
                contact: v.contact,
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
            list = list.filter((r) => matchesStatusFilter(String(r.status), query.status));
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
    // 5) PATCH 요청 (수정)
    // ========================================================
    const patchVehicle = async (id: string | number, patch: Partial<Vehicle>) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload: any = {};

        if (patch.callname !== undefined) payload.callSign = patch.callname;
        if (patch.type !== undefined) payload.typeName = patch.type;
        if (patch.personnel !== undefined)
            payload.personnel = Number(patch.personnel);
        if (patch.contact !== undefined)
            payload.psLteNumber = String(patch.contact).replace(/\D/g, "").slice(0, 11);
        if (patch.rally !== undefined) payload.rallyPoint = patch.rally ? 1 : 0;

        return apiClient.patch(`/vehicles/${id}`, payload);
    };

    // ========================================================
    // 6) 수정 UI 상태
    // ========================================================
    const [editRowId, setEditRowId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<Vehicle>>({});

    const saveEdit = async () => {
        if (!editRowId) return;

        try {
            await patchVehicle(editRowId, editData);
            dispatch(fetchVehicles({}));
            alert("수정 완료");
        } catch (err) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            console.error(err);
            alert("수정 실패");
        }

        setEditRowId(null);
        setEditData({});
    };

    // ========================================================
    // 7) 삭제 기능 (개별/일괄)
    // ========================================================
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState(false);

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(filteredRows.map((r) => String(r.id))));
        } else {
            setSelectedIds(new Set());
        }
    };

    const deleteVehicles = async (ids: string[]) => {
        if (ids.length === 0) return;

        const confirmMsg = ids.length === 1
            ? "선택한 차량을 삭제하시겠습니까?"
            : `선택한 ${ids.length}대의 차량을 삭제하시겠습니까?`;

        if (!window.confirm(confirmMsg)) return;

        setDeleting(true);
        try {
            if (ids.length === 1) {
                // 단건 삭제: DELETE /api/vehicles/{id}
                await apiClient.delete(`/vehicles/${ids[0]}`);
                alert("1대 삭제 완료");
            } else {
                // 다건 삭제: DELETE /api/vehicles (body에 vehicleIds 배열)
                const res = await apiClient.delete(`/vehicles`, {
                    data: { vehicleIds: ids.map((id) => Number(id)) }
                });
                const { deleted } = res.data;
                alert(`${deleted}대 삭제 완료`);
            }
            setSelectedIds(new Set());
            dispatch(fetchVehicles({}));
        } catch (err) {
            console.error(err);
            alert("삭제 실패");
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteSelected = () => {
        deleteVehicles(Array.from(selectedIds));
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
                gpsActiveIds={gpsActiveIds}
                selectedIds={selectedIds}
                toggleSelect={toggleSelect}
                toggleSelectAll={toggleSelectAll}
                onDeleteSelected={handleDeleteSelected}
                deleting={deleting}
            />
        </div>
    );
}
