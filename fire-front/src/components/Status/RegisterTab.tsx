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
    const DEFAULT_STATUS = 3; // 3=집결중 (등록 시 기본값)

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
        url.searchParams.set("address", rallyPoint); // 자원집결지 주소
        return url.toString();
    };


    /* 🔥 단건 등록 + (문자 발송) */
    const handleRegister = async () => {
        if (!form.sido) return alert("시도 선택");
        if (!form.stationName) return alert("소방서 선택");

        const payload = {
            stationName: form.stationName,
            sido: form.sido,
            callSign: form.callSign,
            typeName: form.typeName,
            capacity: form.capacity === "" ? null : form.capacity,
            personnel: form.personnel === "" ? null : form.personnel,
            avlNumber: form.avlNumber,
            psLteNumber: form.psLteNumber,
            status: form.status ?? 3, // 3=집결중 (등록 시 기본값)
        };

        setLoading(true);

        try {
            // 1️⃣ 차량 등록
            const res = await apiClient.post("/vehicles", payload);
            const vehicleId: number | undefined =
                res.data.id ?? res.data.vehicleId;

            if (!vehicleId) {
                alert(
                    "차량은 등록되었지만 vehicleId를 응답에서 찾지 못했습니다.\n" +
                    "백엔드 응답 형식을 확인해주세요."
                );
            } else {
                // 2️⃣ 등록 직후 상태를 집결중(3)으로 설정
                try {
                    await apiClient.patch(`/vehicles/${vehicleId}/status`, {
                        status: 3, // 3=집결중
                    });
                } catch (patchErr: any) {
                    console.warn("차량 상태(집결중) 설정 실패:", patchErr);
                }

                // 3️⃣ 문자 발송
                try {
                    const link = getAssemblyLink(vehicleId);
                    const text = `[자원집결지 동원소방력] 차량:${form.callSign} 집결지:${rallyPoint} 응소OK:${link}`;

                    const smsPayload = { vehicleId, text };

                    // 🔍 우리가 보내는 문자 API 요청 바디 로그
                    console.log("📨 /sms/to-vehicle 요청 payload (단건)", smsPayload);

                    await apiClient.post("/sms/to-vehicle", smsPayload);

                    alert("등록 + 문자 발송 완료");
                } catch (smsErr: any) {
                    console.error(
                        "🚨 /sms/to-vehicle 문자 발송 실패",
                        smsErr?.response?.data ?? smsErr
                    );
                    alert("차량은 등록되었지만 문자 발송에 실패했습니다.");
                }
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
                status: 3, // 3=집결중
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

            const body = excelRows.map((r) => ({
                stationName: r.stationName,
                sido: r.sido,
                typeName: r.typeName,
                callSign: r.callSign,
                capacity: r.capacity === "" ? null : r.capacity,
                personnel: r.personnel === "" ? null : r.personnel,
                avlNumber: r.avlNumber,
                psLteNumber: r.psLteNumber,
                rallyPoint: rallyPointInput,
                status: 3, // 3=집결중 (등록 시 기본값)
            }));

            const res = await apiClient.post("/vehicles/batch", body);

            const {
                total,
                inserted,
                duplicates,
                messages,
                vehicleIds,
            } = res.data;

            alert(`총 ${total} / 성공 ${inserted} / 중복 ${duplicates}`);
            console.log("BATCH RESULT:", res.data);

            if (!inserted || inserted === 0) {
                if (messages && messages.length > 0) {
                    alert(
                        "신규 등록된 차량이 없습니다.\n\n사유:\n" +
                        messages.join("\n")
                    );
                } else {
                    alert("신규 등록된 차량이 없습니다.");
                }
                return;
            }

            if (!vehicleIds || vehicleIds.length === 0) {
                alert(
                    "신규 차량은 등록되었지만 vehicleIds가 응답에 없습니다.\n" +
                    "백엔드 응답 구조를 확인해 주세요."
                );
                return;
            }

            const count = Math.min(inserted, vehicleIds.length);

            // 등록된 각 차량의 상태를 집결중(3)으로 설정
            for (let i = 0; i < count; i++) {
                const vehicleId = vehicleIds[i];
                try {
                    await apiClient.patch(`/vehicles/${vehicleId}/status`, {
                        status: 3, // 3=집결중
                    });
                } catch (patchErr: any) {
                    console.warn(`차량 ${vehicleId} 상태(집결중) 설정 실패:`, patchErr);
                }
            }

            for (let i = 0; i < count; i++) {
                const vehicleId = vehicleIds[i];
                const row = excelRows[i];

                const link = getAssemblyLink(vehicleId);
                const text = `[자원집결지 동원소방력] 차량:${row.callSign} 집결지:${rallyPointInput} 응소OK:${link}`;

                const smsPayload = { vehicleId, text };

                // 🔍 배치 문자 API 요청 바디 로그
                console.log(
                    `📨 /sms/to-vehicle 요청 payload (배치 ${i + 1}/${count})`,
                    smsPayload
                );

                await apiClient.post("/sms/to-vehicle", smsPayload);
            }

            alert(`등록 ${inserted}건 + 문자 발송 완료`);
            setExcelRows([]);
        } catch (err: any) {
            console.error(err);
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
