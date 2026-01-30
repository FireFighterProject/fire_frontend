// src/pages/gps/AssemblyRequestPage.tsx
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";

const AssemblyRequest = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();

    // 🔹 URL 쿼리로 받는 값들
    const vehicleIdParam = params.get("vehicleId");
    const missionId = params.get("missionId") ?? "";
    const title = params.get("title") ?? "";
    const address = params.get("address") ?? "";
    const desc = params.get("desc") ?? "";

    const vehicleId = vehicleIdParam ? Number(vehicleIdParam) : null;

    // GPS 상태
    const [lat, setLat] = useState<number | null>(null);
    const [lon, setLon] = useState<number | null>(null);
    const [gpsError, setGpsError] = useState("");
    const [loading, setLoading] = useState(false);

    // 🔥 위치 요청 공통 로직
    const requestLocation = () => {
        setGpsError("");
        if (!navigator.geolocation) {
            setGpsError("브라우저에서 GPS를 지원하지 않습니다.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLat(pos.coords.latitude);
                setLon(pos.coords.longitude);
            },
            () => {
                setGpsError("위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.");
            },
            { enableHighAccuracy: true }
        );
    };

    // 🔥 페이지 로드 시 자동 요청 (이미 허용된 경우 바로 좌표 표시)
    useEffect(() => {
        if (!vehicleId) return;
        setGpsError("");
        if (!navigator.geolocation) {
            setGpsError("브라우저에서 GPS를 지원하지 않습니다.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLat(pos.coords.latitude);
                setLon(pos.coords.longitude);
            },
            () => {
                setGpsError("위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.");
            },
            { enableHighAccuracy: true }
        );
    }, [vehicleId]);

    // 🔥 응소 OK 처리: 집결 플래그 + GPS 전송
    const handleAccept = async () => {
        if (!vehicleId) {
            alert("차량 정보가 없습니다. 링크가 올바른지 확인해주세요.");
            return;
        }

        if (lat === null || lon === null) {
            alert("GPS 정보를 불러오는 중입니다.");
            return;
        }

        try {
            setLoading(true);

            // 1) 집결지 플래그 설정 (rallyPoint = 1)
            await api.patch(`/vehicles/${vehicleId}/assembly`, {
                rallyPoint: 1,
            });

            // 2) 현재 위치 1회 전송
            await api.post("/gps/send", {
                vehicleId,
                latitude: lat,
                longitude: lon,
            });

            // 3) 출동/위치 모니터링 페이지로 이동
            navigate(
                `/gps/assemblynav?vehicleId=${vehicleId}&address=${encodeURIComponent(
                    address
                )}`
            );

        } catch (err) {
            console.error(err);
            alert("응소 처리 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    if (!vehicleId) {
        return (
            <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white shadow rounded-xl p-6 text-center">
                    <p className="text-red-600 font-semibold">
                        차량 정보가 없습니다. 잘못된 링크입니다.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen flex justify-center bg-gray-50">
            <div className="w-full max-w-xl p-5 sm:p-6 md:p-8 flex flex-col gap-6">

                <h2 className="text-center text-2xl sm:text-3xl font-bold">
                    🚨 자원집결지 동원 소방력
                </h2>

                {/* 요청 정보 */}
                <div className="bg-white rounded-xl shadow p-4 sm:p-5 space-y-3">
                    <div className="text-gray-800 text-base sm:text-lg space-y-1">
                        {title && (
                            <p>
                                <span className="font-semibold">출동 제목:</span> {title}
                            </p>
                        )}
                        {address && (
                            <p>
                                <span className="font-semibold">집결지 주소:</span> {address}
                            </p>
                        )}
                        {desc && (
                            <p>
                                <span className="font-semibold">출동 내용:</span> {desc}
                            </p>
                        )}
                        <p>
                            <span className="font-semibold">차량 ID:</span> {vehicleId}
                        </p>
                        {missionId && (
                            <p>
                                <span className="font-semibold">출동 코드:</span> {missionId}
                            </p>
                        )}
                    </div>
                </div>

                {/* GPS 상태 */}
                <div className="bg-white rounded-xl shadow p-4 sm:p-5 text-center">
                    <h3 className="font-semibold text-lg sm:text-xl mb-2">
                        현재 GPS 수신상태
                    </h3>

                    {gpsError ? (
                        <div className="space-y-3">
                            <p className="text-red-600 text-sm sm:text-base">{gpsError}</p>
                            <button
                                onClick={requestLocation}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                            >
                                GPS 권한 허용
                            </button>
                        </div>
                    ) : lat !== null && lon !== null ? (
                        <p className="text-gray-700 font-mono text-sm sm:text-base">
                            위도 {lat.toFixed(6)} <br />
                            경도 {lon.toFixed(6)}
                        </p>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-gray-500 text-sm sm:text-base">
                                위치 정보를 사용하려면 아래 버튼을 눌러 주세요.
                            </p>
                            <button
                                onClick={requestLocation}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                            >
                                GPS 권한 허용
                            </button>
                        </div>
                    )}
                </div>

                {/* 응소 버튼 */}
                <button
                    onClick={handleAccept}
                    disabled={loading || lat === null || lon === null}
                    className={`
                        bg-red-600 text-white font-bold 
                        py-4 rounded-xl text-xl 
                        active:scale-[0.98] transition
                        shadow-md
                        disabled:opacity-60 disabled:cursor-not-allowed
                    `}
                >
                    {loading ? "응소 처리중..." : "응소 OK (집결지 이동)"}
                </button>
            </div>
        </div>
    );
};

export default AssemblyRequest;
