// src/pages/GPSReady.tsx
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";

const GPSReady = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();

    // 요청 정보
    const missionId = params.get("missionId") ?? "";
    const vehicle = params.get("vehicle") ?? "";
    const title = params.get("title") ?? "";
    const address = params.get("address") ?? "";
    const desc = params.get("desc") ?? "";

    // GPS 상태
    const [lat, setLat] = useState<number | null>(null);
    const [lon, setLon] = useState<number | null>(null);
    const [error, setError] = useState("");

    // 🔥 페이지 진입 즉시 GPS 권한 요청
    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLat(pos.coords.latitude);
                setLon(pos.coords.longitude);
            },
            () => setError("GPS 권한이 필요합니다."),
            { enableHighAccuracy: true }
        );
    }, []);

    // 🔥 출동 시작
    const handleStart = async () => {
        if (lat === null || lon === null) {
            alert("GPS 정보를 불러오는 중입니다.");
            return;
        }

        try {
            // GPS 1회 저장
            await api.post("/gps/send", {
                vehicleId: Number(vehicle),
                latitude: lat,
                longitude: lon,
            });

            // 모든 정보를 GPSStatus로 전달
            navigate(
                `/gps/status?missionId=${missionId}&vehicle=${vehicle}&title=${title}&address=${address}&desc=${desc}`
            );
        } catch (err) {
            console.error(err);
            alert("GPS 위치 전송 실패");
        }
    };

    return (
        <div className="w-full min-h-screen flex justify-center bg-gray-50">
            <div className="w-full max-w-xl p-5 flex flex-col gap-6">

                <h2 className="text-center text-2xl sm:text-3xl font-bold">
                    🚨 출동 요청
                </h2>

                {/* 요청 정보 */}
                <div className="bg-white rounded-xl shadow p-4 space-y-3">
                    <div className="text-gray-800 text-lg space-y-1">
                        <p><span className="font-semibold">제목:</span> {title}</p>
                        <p><span className="font-semibold">주소:</span> {address}</p>
                        <p><span className="font-semibold">내용:</span> {desc}</p>
                        <p><span className="font-semibold">차량 번호:</span> {vehicle}호</p>
                        <p><span className="font-semibold">출동 코드:</span> {missionId}</p>
                    </div>
                </div>

                {/* GPS 상태 */}
                <div className="bg-white rounded-xl shadow p-4 text-center">
                    <h3 className="font-semibold text-xl mb-2">현재 GPS 수신상태</h3>

                    {error ? (
                        <p className="text-red-600">{error}</p>
                    ) : lat && lon ? (
                        <p className="text-gray-700 font-mono">
                            위도 {lat.toFixed(6)} <br />
                            경도 {lon.toFixed(6)}
                        </p>
                    ) : (
                        <p className="text-gray-500">GPS 정보를 불러오는 중...</p>
                    )}
                </div>

                {/* 버튼 */}
                <button
                    onClick={handleStart}
                    className="bg-red-600 text-white font-bold py-4 rounded-xl text-xl shadow-md active:scale-95 transition"
                >
                    출동 시작 OK
                </button>
            </div>
        </div>
    );
};

export default GPSReady;
