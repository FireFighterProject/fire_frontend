/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import apiClient from "../../api/axios";
import { devLog } from "../../utils/devLog";
import { fetchFireStations } from "../../api/stations";

import RegisterForm from "./Register/RegisterForm";
import ExcelUploader from "./Register/ExcelUploader";

import {
    toNum,
    normalizeStationName,
    resolveSidoFromStation,
    toBatchSido,
    SIDO_OPTIONS
} from "../../services/Register/utils";
import { buildAppPath } from "../../utils/appUrl";
import {
    formatSmsResultMessage,
    matchExcelRowsToVehicleIds,
    sendBulkSms,
} from "../../services/Register/batchSms";

/* 타입 정의 */
export type ApiVehicle = {
    stationName: string;
    sido: string;
    callSign: string;
    typeName: string;
    personnel: number | "";
    contact: string;
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
    serialNo: number | "";
    stationName: string;
    callSign: string;
    typeName: string;
    personnel: number | "";
    contact: string;
    sido: string;
};

function RegisterTab() {
    const DEFAULT_STATUS = 3;

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
        personnel: "",
        contact: "",
        status: DEFAULT_STATUS,
    });

    const [stations, setStations] = useState<FireStation[]>([]);
    const [excelRows, setExcelRows] = useState<ExcelPreviewRow[]>([]);
    const [loading, setLoading] = useState(false);
    const fileRef = useRef<HTMLInputElement | null>(null);

    const onChange = (key: keyof ApiVehicle, value: any) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    useEffect(() => {
        if (!form.sido) {
            setStations([]);
            return;
        }

        fetchFireStations(form.sido)
            .then(setStations)
            .catch((e) => {
                console.error("fire-stations 조회 실패:", e);
                setStations([]);
            });

        setForm((p) => ({ ...p, stationName: "" }));
    }, [form.sido]);

    const ensureStationsLoaded = async (sido: string) => fetchFireStations(sido);

    const getAssemblyLink = (vehicleId: number) =>
        buildAppPath(
            `/gps/assembly?vehicleId=${vehicleId}&address=${encodeURIComponent(rallyPoint)}`
        );

    const buildVehiclePayload = (row: {
        stationName: string;
        sido: string;
        callSign: string;
        typeName: string;
        personnel: number | "";
        contact: string;
    }) => ({
        stationName: row.stationName,
        sido: row.sido,
        callSign: row.callSign,
        typeName: row.typeName,
        personnel: row.personnel === "" ? null : row.personnel,
        phoneNumber: row.contact,
        psLteNumber: row.contact,
        status: DEFAULT_STATUS,
    });

    const buildBatchVehiclePayload = (row: {
        stationName: string;
        sido: string;
        callSign: string;
        typeName: string;
        personnel: number | "";
        contact: string;
    }) => ({
        stationName: row.stationName,
        sido: toBatchSido(row.sido || "경상북도"),
        callSign: row.callSign,
        typeName: row.typeName,
        personnel: row.personnel === "" ? undefined : Number(row.personnel),
        phoneNumber: row.contact,
        psLteNumber: row.contact,
    });

    const handleRegister = async () => {
        if (!form.sido) return alert("시도 선택");
        if (!form.stationName) return alert("소방서 선택");

        const payload = buildVehiclePayload(form);

        setLoading(true);

        try {
            const res = await apiClient.post("/vehicles", payload);
            const vehicleId: number | undefined =
                res.data.id ?? res.data.vehicleId;

            if (!vehicleId) {
                alert(
                    "차량은 등록되었지만 vehicleId를 응답에서 찾지 못했습니다.\n" +
                    "백엔드 응답 형식을 확인해주세요."
                );
            } else {
                try {
                    await apiClient.patch(`/vehicles/${vehicleId}/status`, {
                        status: 3,
                    });
                } catch (patchErr: any) {
                    console.warn("차량 상태(집결중) 설정 실패:", patchErr);
                }

                try {
                    const link = getAssemblyLink(vehicleId);
                    const text = `[자원집결지 동원소방력] 차량:${form.callSign} 집결지:${rallyPoint} 응소OK:${link}`;

                    await apiClient.post("/sms/to-vehicle", { vehicleId, text });
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
                personnel: "",
                contact: "",
                status: DEFAULT_STATUS,
            });
        } catch (err: any) {
            console.error("🚨 /vehicles 단건 등록 실패", err?.response?.data ?? err);
            alert(err?.response?.data?.message ?? "단건 등록 실패");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkRegister = async (rallyPointInput: string) => {
        if (excelRows.length === 0) return alert("엑셀 데이터 없음");

        const invalidRows = excelRows.filter(
            (r) => !r.stationName || !r.callSign
        );
        if (invalidRows.length > 0) {
            alert("소방서명 또는 호출명이 비어 있는 행이 있습니다.");
            return;
        }

        try {
            setLoading(true);

            const body = excelRows.map((r) => buildBatchVehiclePayload(r));

            const res = await apiClient.post("/vehicles/batch", body);

            const {
                total,
                inserted,
                duplicates,
                messages,
                vehicleIds,
            } = res.data;

            alert(`총 ${total} / 성공 ${inserted} / 중복 ${duplicates}`);
            devLog("BATCH RESULT:", res.data);

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

            const pairs = await matchExcelRowsToVehicleIds(excelRows, vehicleIds);

            if (pairs.length < inserted) {
                console.warn(
                    `[batch] 매칭 누락: 등록 ${inserted}건, 매칭 ${pairs.length}건`,
                    { vehicleIds, excelRows }
                );
            }

            await Promise.allSettled(
                pairs.map(({ vehicleId }) =>
                    apiClient.patch(`/vehicles/${vehicleId}/status`, { status: 3 })
                )
            );

            const smsResult = await sendBulkSms(pairs, (vehicleId, row) => {
                const link = getAssemblyLink(vehicleId);
                return `[자원집결지 동원소방력] 차량:${row.callSign} 집결지:${rallyPointInput} 응소OK:${link}`;
            });

            alert(formatSmsResultMessage(inserted, smsResult));
            setExcelRows([]);
        } catch (err: any) {
            console.error(err);
            const status = err?.response?.status;
            const msg =
                err?.response?.data?.message ??
                err?.response?.data?.error ??
                err?.message ??
                "일괄 등록 실패";
            if (status === 403) {
                alert(
                    `일괄 등록 거부(403)\n\n` +
                    `${msg}\n\n` +
                    `배포 서버 nginx에 Origin 헤더 제거 설정이 필요할 수 있습니다.\n` +
                    `(DOCS/deploy/apply-https-nginx.sh 참고)`
                );
            } else {
                alert(status ? `[${status}] ${msg}` : msg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
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

            <ExcelUploader
                fileRef={fileRef}
                excelRows={excelRows}
                setExcelRows={setExcelRows}
                loading={loading}
                handleBulkRegister={handleBulkRegister}
                normalizeStationName={normalizeStationName}
                resolveSidoFromStation={resolveSidoFromStation}
                onBeforeParse={() =>
                    ensureStationsLoaded(form.sido || "경상북도")
                }
                toNum={toNum}
                rallyPoint={rallyPoint}
                setRallyPoint={setRallyPoint}
            />
        </div>
    );
}

export default RegisterTab;
