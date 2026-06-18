// src/pages/GPSStandby.tsx
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import apiClient from "../../api/axios";
import { devLog } from "../../utils/devLog";

const GPSStandby = () => {
    const [params] = useSearchParams();
    // const missionId = params.get("missionId") ?? "";
    const vehicleId = params.get("vehicle") ?? "";

    // 🔄 출동 종료 시 → 차량 상태를 "철수"로 변경
    useEffect(() => {
        if (!vehicleId) return;

        const updateStatus = async () => {
            try {
                await apiClient.patch(`/vehicles/${vehicleId}/status`, {
                    status: "철수"
                });
                devLog("차량 상태 철수로 업데이트 완료");
            } catch (err) {
                console.error("🚨 차량 철수 업데이트 실패", err);
            }
        };

        updateStatus();
    }, [vehicleId]);


    // 🔒 브라우저 종료 방지
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };

        window.addEventListener("beforeunload", handler);

        return () => {
            window.removeEventListener("beforeunload", handler);
        };
    }, []);

    return (
        <div className="w-full min-h-screen flex justify-center items-center bg-gray-100">
            <div className="bg-white shadow-lg rounded-xl p-8 max-w-md text-center">
                <h2 className="text-3xl font-bold mb-4">⏳ 출동 종료</h2>
                <p className="text-gray-700 text-lg leading-relaxed">
                    출동이 정상적으로 종료되었습니다.<br />
                    <strong>다음 출동 지령을 기다려주세요.</strong>
                </p>
            </div>
        </div>
    );
};

export default GPSStandby;
