// src/pages/GPSStart.tsx
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const GPSStart = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();

    // URL 파라미터 가져오기
    const missionId = params.get("missionId") ?? "";
    const title = params.get("title") ?? "";
    const address = params.get("address") ?? "";
    const desc = params.get("desc") ?? "";

    // GPS 상태값
    const [lat, setLat] = useState<number | null>(null);
    const [lon, setLon] = useState<number | null>(null);
    const [error, setError] = useState("");

    // 컴포넌트 로드시 GPS 요청
    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLat(pos.coords.latitude);
                setLon(pos.coords.longitude);
            },
            () => {
                setError("GPS 권한이 필요합니다.");
            },
            { enableHighAccuracy: true }
        );
    }, []);

    return (
        <div className="p-6 flex flex-col gap-4">
            <h2 className="text-xl font-bold">🚒 출동 시작</h2>

            {/* URL로 넘어온 기본 정보 */}
            <div className="space-y-1 text-gray-800">
                <p><span className="font-semibold">📌 제목:</span> {title}</p>
                <p><span className="font-semibold">📍 주소:</span> {address}</p>
                <p><span className="font-semibold">📝 내용:</span> {desc}</p>
                <p><span className="font-semibold">Mission ID:</span> {missionId}</p>
            </div>

            <hr />

            {/* GPS 정보 */}
            <div>
                <h3 className="text-lg font-semibold mb-2">📡 현재 GPS 위치</h3>

                {error && <p className="text-red-500">{error}</p>}

                {!error && lat && lon && (
                    <div className="space-y-1 text-gray-800">
                        <p>위도: {lat}</p>
                        <p>경도: {lon}</p>
                    </div>
                )}

                {!error && !lat && !lon && (
                    <p className="text-gray-500">GPS 정보를 불러오는 중...</p>
                )}
            </div>

            <button
                onClick={() => navigate(-1)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
            >
                돌아가기
            </button>
        </div>
    );
};

export default GPSStart;
