import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import apiClient from "../../api/axios";
import { fetchVehicleList } from "../../api/vehicles";
import DispatchProgressBar from "../../components/gps/DispatchProgressBar";
import { VEHICLE_STATUS_CODE } from "../../services/vehicle/status";
import { devLog } from "../../utils/devLog";

type Phase = "loading" | "returning" | "complete";

const GPSStandby = () => {
    const [params] = useSearchParams();
    const vehicleId = params.get("vehicle") ?? "";

    const [phase, setPhase] = useState<Phase>("loading");
    const [callSign, setCallSign] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!vehicleId) {
            setPhase("returning");
            return;
        }

        let cancelled = false;

        const initStatus = async () => {
            try {
                const list = await fetchVehicleList();
                if (cancelled) return;

                const vehicle = list.find((v) => String(v.id) === vehicleId);
                if (vehicle?.callSign) {
                    setCallSign(vehicle.callSign);
                }

                if (vehicle?.status === VEHICLE_STATUS_CODE.대기) {
                    setPhase("complete");
                    return;
                }

                if (vehicle?.status !== VEHICLE_STATUS_CODE.복귀중) {
                    await apiClient.patch(`/vehicles/${vehicleId}/status`, {
                        status: VEHICLE_STATUS_CODE.복귀중,
                    });
                    devLog("차량 상태 복귀중으로 업데이트 완료");
                }

                if (!cancelled) setPhase("returning");
            } catch (err) {
                console.error("차량 상태 확인/업데이트 실패", err);
                if (!cancelled) setPhase("returning");
            }
        };

        void initStatus();

        return () => {
            cancelled = true;
        };
    }, [vehicleId]);

    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (phase === "complete") return;
            e.preventDefault();
            e.returnValue = "";
        };

        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [phase]);

    const handleReturnComplete = async () => {
        if (!vehicleId) {
            alert("차량 정보가 없습니다.");
            return;
        }

        const ok = window.confirm(
            "소방서·집결지에 도착했습니까?\n복귀를 완료하고 대기 상태로 전환합니다."
        );
        if (!ok) return;

        setSubmitting(true);
        try {
            await apiClient.patch(`/vehicles/${vehicleId}/status`, {
                status: VEHICLE_STATUS_CODE.대기,
            });
            setPhase("complete");
        } catch (err) {
            console.error("대기 상태 전환 실패", err);
            alert("복귀완료 처리에 실패했습니다. 다시 시도해 주세요.");
        } finally {
            setSubmitting(false);
        }
    };

    const vehicleLabel = callSign
        ? `${callSign} (${vehicleId}호)`
        : vehicleId
          ? `${vehicleId}호`
          : undefined;

    const progressStep = phase === "complete" ? "complete" : "return";
    const nextAction =
        phase === "complete"
            ? "대기 중입니다. 다음 출동 지령을 기다려 주세요."
            : "소방서·집결지 도착 후 아래 [복귀완료] 버튼을 눌러 주세요.";

    return (
        <div className="flex min-h-[100dvh] w-full flex-col bg-gray-100">
            <DispatchProgressBar
                currentStep={progressStep}
                nextAction={nextAction}
                vehicleLabel={vehicleLabel}
            />

            <div className="flex flex-1 flex-col items-center justify-center px-4 py-6 sm:py-8">
                {phase === "loading" ? (
                    <div className="text-center text-base text-gray-600 sm:text-lg">
                        상태 확인 중...
                    </div>
                ) : phase === "complete" ? (
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 text-center shadow-xl sm:rounded-3xl sm:p-8">
                        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl sm:mb-6 sm:h-24 sm:w-24 sm:text-5xl">
                            ✓
                        </div>
                        <h2 className="mb-2 text-2xl font-bold text-green-800 sm:mb-3 sm:text-3xl">
                            대기 중
                        </h2>
                        <p className="text-base leading-relaxed text-gray-700 sm:text-lg">
                            복귀가 완료되었습니다.
                            <br />
                            <strong>다음 출동 지령을 기다려 주세요.</strong>
                        </p>
                    </div>
                ) : (
                    <div className="flex w-full max-w-lg flex-col gap-4 sm:gap-6">
                        <div className="rounded-2xl bg-white p-6 text-center shadow-xl sm:rounded-3xl sm:p-8">
                            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-4xl sm:mb-6 sm:h-24 sm:w-24 sm:text-5xl">
                                🚒
                            </div>
                            <h2 className="mb-2 text-2xl font-bold text-amber-900 sm:mb-3 sm:text-3xl">
                                복귀 중
                            </h2>
                            <p className="text-base leading-relaxed text-gray-700 sm:text-lg">
                                상황이 종료되었습니다.
                                <br />
                                <strong>집결지·소방서로 복귀해 주세요.</strong>
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleReturnComplete}
                            disabled={submitting}
                            className={
                                "w-full rounded-2xl py-4 text-lg font-bold text-white shadow-lg transition active:scale-[0.98] sm:py-6 sm:text-2xl " +
                                (submitting
                                    ? "cursor-not-allowed bg-gray-400"
                                    : "bg-green-600 hover:bg-green-700")
                            }
                        >
                            {submitting ? "처리 중..." : "복귀완료 · 대기 전환"}
                        </button>

                        <p className="text-center text-xs text-gray-500 sm:text-sm">
                            도착 후에만 눌러 주세요. 관제 화면에서 대기 차량으로 표시됩니다.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GPSStandby;
