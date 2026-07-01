// src/pages/GPSReady.tsx
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import DispatchProgressBar from "../../components/gps/DispatchProgressBar";
import NoTranslate from "../../components/common/NoTranslate";

const GPSReady = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();

    const missionId = params.get("missionId") ?? "";
    const vehicle = params.get("vehicle") ?? "";

    const [title, setTitle] = useState("");
    const [address, setAddress] = useState("");
    const [desc, setDesc] = useState("");

    const [lat, setLat] = useState<number | null>(null);
    const [lon, setLon] = useState<number | null>(null);
    const [error, setError] = useState("");

    // 출동 정보 자동 불러오기
    useEffect(() => {
        async function loadOrder() {
            if (!missionId) return;

            try {
                const res = await api.get(`/dispatch-orders/${missionId}`);
                setTitle(res.data.title);
                setAddress(res.data.address);
                setDesc(res.data.content);
            } catch (e) {
                console.error("출동 정보 조회 실패", e);
            }
        }
        loadOrder();
    }, [missionId]);

    // GPS 최초 1회 가져오기
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

    // 🚀 출동 시작 → 네비게이션 페이지로 바로 이동
    const handleStart = async () => {
        if (lat === null || lon === null) {
            alert("GPS 정보를 불러오는 중입니다.");
            return;
        }

        try {
            // GPS 첫 전송
            await api.post("/gps/send", {
                vehicleId: Number(vehicle),
                latitude: lat,
                longitude: lon,
            });

            // ⭐ 쿼리로 출동 정보 + 차량 번호도 같이 전달
            const encodedAddress = encodeURIComponent(address);
            const encodedTitle = encodeURIComponent(title);
            const encodedDesc = encodeURIComponent(desc);

            navigate(
                `/map/navigation?startLat=${lat}&startLon=${lon}` +
                `&dest=${encodedAddress}` +
                `&title=${encodedTitle}` +
                `&desc=${encodedDesc}` +
                `&vehicle=${vehicle}`
            );
        } catch (err) {
            console.error(err);
            alert("GPS 위치 전송 실패");
        }
    };




    const vehicleLabel = vehicle ? `${vehicle}호` : undefined;

    return (
        <div className="flex min-h-[100dvh] w-full flex-col bg-gray-50">
            <DispatchProgressBar
                currentStep="dispatch"
                nextAction="아래 [출동 시작 OK] 버튼을 눌러 현장으로 이동하세요."
                vehicleLabel={vehicleLabel}
            />

            <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-4 sm:gap-6 sm:p-5">
                <h2 className="text-center text-xl font-bold sm:text-3xl">
                    🚨 출동 요청
                </h2>

                <NoTranslate
                    as="div"
                    className="space-y-2 rounded-xl bg-white p-4 shadow sm:space-y-3"
                >
                    <p className="text-sm sm:text-base">
                        <strong>제목:</strong> {title}
                    </p>
                    <p className="text-sm leading-snug sm:text-base">
                        <strong>주소:</strong> {address}
                    </p>
                    <p className="text-sm leading-snug sm:text-base">
                        <strong>내용:</strong> {desc}
                    </p>
                    <p className="text-sm sm:text-base">
                        <strong>차량 번호:</strong> {vehicle}호
                    </p>
                    <p className="text-sm sm:text-base">
                        <strong>출동 코드:</strong> {missionId}
                    </p>
                </NoTranslate>

                <div className="rounded-xl bg-white p-4 text-center shadow">
                    <h3 className="mb-2 text-lg font-semibold sm:text-xl">
                        현재 GPS 수신상태
                    </h3>

                    {error ? (
                        <p className="text-sm text-red-600 sm:text-base">{error}</p>
                    ) : lat && lon ? (
                        <p className="font-mono text-sm text-gray-700 sm:text-base">
                            위도 {lat.toFixed(6)} <br />
                            경도 {lon.toFixed(6)}
                        </p>
                    ) : (
                        <p className="text-sm text-gray-500 sm:text-base">
                            GPS 정보를 불러오는 중...
                        </p>
                    )}
                </div>

                <button
                    onClick={handleStart}
                    className="mt-auto rounded-2xl bg-red-600 py-4 text-xl font-bold text-white shadow-lg transition active:scale-95 sm:py-5 sm:text-2xl"
                >
                    출동 시작 OK
                </button>
            </div>
        </div>
    );
};

export default GPSReady;
