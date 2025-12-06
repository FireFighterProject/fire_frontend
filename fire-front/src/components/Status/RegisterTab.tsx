/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import apiClient from "../../api/axios";

import RegisterForm from "./Register/RegisterForm";
import ExcelUploader from "./Register/ExcelUploader";

import {
    toNum,
    toFullSido,
    normalizeStationName,
    SIDO_OPTIONS
} from "../../services/Register/utils";

/* 타입 정의 */
export type ApiVehicle = {
    stationName: string;
    sido: string;
    callSign: string;
    typeName: string;
    capacity: number | "";
    personnel: number | "";
    avlNumber: string;
    psLteNumber: string;
    status: number;
};

export type FireStation = {
    id: number;
    sido: string;
    name: string;
    address: string;
};

export type ExcelPreviewRow = {
    id: string;
    sido: string;
    stationName: string;
    typeName: string;
    callSign: string;
    capacity: number | "";
    personnel: number | "";
    avlNumber: string;
    psLteNumber: string;
};

function RegisterTab() {
    const DEFAULT_STATUS = 0;

    // 🔥 자원집결지 주소 저장
    const [rallyPoint, setRallyPoint] = useState<string>(
        localStorage.getItem("rallyPoint") ?? ""
    );

    useEffect(() => {
        localStorage.setItem("rallyPoint", rallyPoint);
    }, [rallyPoint]);

    const [form, setForm] = useState<ApiVehicle>({
        stationName: "",
        sido: "",
        callSign: "",
        typeName: "",
        capacity: "",
        personnel: "",
        avlNumber: "",
        psLteNumber: "",
        status: DEFAULT_STATUS,
    });

    const [stations, setStations] = useState<FireStation[]>([]);
    const [allStations, setAllStations] = useState<FireStation[]>([]);
    const [excelRows, setExcelRows] = useState<ExcelPreviewRow[]>([]);
    const [loading, setLoading] = useState(false);
    const fileRef = useRef<HTMLInputElement | null>(null);

    const onChange = (key: keyof ApiVehicle, value: any) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    /* 🔥 소방서 전체 로드 */
    useEffect(() => {
        apiClient.get("/fire-stations").then((res) => setAllStations(res.data));
    }, []);

    /* 🔥 시도 변경 → 소방서 필터링 */
    useEffect(() => {
        setStations(
            form.sido ? allStations.filter((s) => s.sido === form.sido) : []
        );
        setForm((p) => ({ ...p, stationName: "" }));
    }, [form.sido, allStations]);

    //////////////////////////////////////////////////////
    // 🔥 공통: 프론트 도메인 기반 응소 페이지 링크 생성 함수
    //////////////////////////////////////////////////////
    const getAssemblyLink = (vehicleId: number) => {
        const origin =
            typeof window !== "undefined" ? window.location.origin : "";
        const url = new URL("/gps/assembly", origin);
        url.searchParams.set("vehicleId", String(vehicleId));
        // 필요하면 여기서 missionId, title, address 같은 것도 추가 가능
        url.searchParams.set("address", rallyPoint);
        return url.toString();
    };

    /* 🔥 단건 등록 + (문자 발송) */
    const handleRegister = async () => {
        if (!form.sido) return alert("시도 선택");
        if (!form.stationName) return alert("소방서 선택");

        const payload = {
            ...form,
            capacity: form.capacity === "" ? null : form.capacity,
            personnel: form.personnel === "" ? null : form.personnel,
            // ❌ rallyPoint는 백엔드 플래그 필드(0/1)라서 절대 보내지 않는다
            // rallyPoint: rallyPoint,
        };

        try {
            setLoading(true);

            // 1) 차량 등록
            const res = await apiClient.post("/vehicles", payload);

            const vehicleId: number | undefined =
                res.data.id ?? res.data.vehicleId;

            if (vehicleId) {
                const link = getAssemblyLink(vehicleId);
                const text = `
[자원집결지 동원소방력 안내]
차량: ${form.callSign}
집결지: ${rallyPoint}

아래 링크에서 '응소 OK' 버튼을 눌러주세요.
${link}
            `.trim();

                await apiClient.post("/sms/to-vehicle", {
                    vehicleId,
                    text,
                });

                alert("등록 + 문자 발송 완료");
            } else {
                alert("등록은 완료되었지만 vehicleId 정보가 없어 문자를 보낼 수 없습니다.");
            }

            setForm({
                stationName: "",
                sido: "",
                callSign: "",
                typeName: "",
                capacity: "",
                personnel: "",
                avlNumber: "",
                psLteNumber: "",
                status: 0,
            });
        } catch (err: any) {
            console.error("🚨 /vehicles 단건 등록 실패", err?.response?.data ?? err);
            alert(err?.response?.data?.message ?? "단건 등록 실패");
        } finally {
            setLoading(false);
        }
    };

    /* 🔥 일괄 등록 + 문자 발송 */
const handleBulkRegister = async (rallyPointInput: string) => {
                    if (excelRows.length === 0) return alert("엑셀 데이터 없음");

                    try {
                        setLoading(true);

                        // 1) 차량 다건 등록
                        const res = await apiClient.post(
                            "/vehicles/batch",
                            excelRows.map((r) => ({
                                stationName: r.stationName,
                                sido: r.sido,
                                typeName: r.typeName,
                                callSign: r.callSign,
                                capacity: r.capacity === "" ? null : r.capacity,
                                personnel: r.personnel === "" ? null : r.personnel,
                                avlNumber: r.avlNumber,
                                psLteNumber: r.psLteNumber,
                                // ❌ 여기서도 rallyPoint(주소)를 절대 보내지 않는다
                                // rallyPoint: rallyPointInput,
                            }))
                        );

                        const vehicleIds: number[] = res.data.vehicleIds ?? [];
                        const insertedCount: number = res.data.inserted ?? vehicleIds.length;

                        if (!vehicleIds || vehicleIds.length === 0) {
                            alert("등록되었으나 vehicleId 정보를 받지 못했습니다.");
                            return;
                        }

                        const count = Math.min(insertedCount, vehicleIds.length);

                        // 2) 문자 발송
                        for (let i = 0; i < count; i++) {
                            const vehicleId = vehicleIds[i];
                            const row = excelRows[i];

                            const link = getAssemblyLink(vehicleId);
                            const text = `
[자원집결지 동원소방력 안내]
차량: ${row.callSign}
집결지: ${rallyPointInput}

아래 링크에서 '응소 OK' 버튼을 눌러주세요.
${link}
            `.trim();

                            await apiClient.post("/sms/to-vehicle", {
                                vehicleId,
                                text,
                            });
                        }

                        alert(`등록 ${insertedCount}건 + 문자 발송 완료`);
                        setExcelRows([]);
                    } catch (err: any) {
                        console.error("🚨 /vehicles/batch 일괄 등록 실패", err?.response?.data ?? err);
                        alert(err?.response?.data?.message ?? "일괄 등록 실패");
                    } finally {
                        setLoading(false);
                    }
                };


    return (
        <div className="p-6 space-y-6">
            {/* 단건 등록 폼 */}
            <RegisterForm
                form={form}
                stations={stations}
                onChange={onChange}
                loading={loading}
                handleRegister={handleRegister}
                SIDO_OPTIONS={SIDO_OPTIONS}
                toNum={toNum}
                rallyPoint={rallyPoint}
                setRallyPoint={setRallyPoint}
            />

            {/* 엑셀 업로드 */}
            <ExcelUploader
                fileRef={fileRef}
                excelRows={excelRows}
                setExcelRows={setExcelRows}
                loading={loading}
                handleBulkRegister={handleBulkRegister}
                toFullSido={toFullSido}
                normalizeStationName={normalizeStationName}
                toNum={toNum}
                rallyPoint={rallyPoint}
                setRallyPoint={setRallyPoint}
            />
        </div>
    );
}

export default RegisterTab;
