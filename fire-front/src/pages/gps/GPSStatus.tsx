// src/pages/GPSStatus.tsx
import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../api/axios";

type MissionDetail = {
    orderId: number;
    title: string;
    address: string;
    content: string;
    batches: {
        batchNo: number;
        vehicles: {
            id: number;
            callSign: string;
        }[];
    }[];
};

const GPSStatus = () => {
    const [params] = useSearchParams();

    const missionId = params.get("missionId") ?? "";
    const vehicleId = params.get("vehicle") ?? "";

    const [mission, setMission] = useState<MissionDetail | null>(null);

    const [lat, setLat] = useState<number | null>(null);
    const [lon, setLon] = useState<number | null>(null);
    const [gpsStatus, setGpsStatus] = useState("준비중");

    /* ============================================
     * 🔥 출동 상세 정보 자동 불러오기
     * ============================================ */
    useEffect(() => {
        if (!missionId) return;

        api.get(`/dispatch-orders/${missionId}`)
            .then((res) => {
                setMission(res.data);
            })
            .catch((err) => {
                console.error(err);
                alert("출동 정보를 불러올 수 없습니다.");
            });
    }, [missionId]);

    /* ============================================
     * 🔥 GPS 5초마다 자동 전송
     * ============================================ */
    useEffect(() => {
        if (!vehicleId) return;

        const interval = setInterval(() => {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const latitude = pos.coords.latitude;
                    const longitude = pos.coords.longitude;

                    setLat(latitude);
                    setLon(longitude);

                    try {
                        await api.post("/gps/send", {
                            vehicleId: Number(vehicleId),
                            latitude,
                            longitude,
                        });
                        setGpsStatus("전송 성공");
                    } catch {
                        setGpsStatus("전송 실패");
                    }
                },
                () => setGpsStatus("GPS 권한 필요"),
                { enableHighAccuracy: true }
            );
        }, 5000);

        return () => clearInterval(interval);
    }, [vehicleId]);

    /* ============================================
     * 🔥 상황 종료
     * ============================================ */
    const endMission = async () => {
        if (window.confirm("상황을 종료하시겠습니까?")) {
            alert("당신의 노고에 감사드립니다.");

            // GPS 추적 종료는 useEffect cleanup에서 자동 실행됨.
            // 이제 대기 페이지로 이동
            window.location.href = `/gps/standby`;
        }
    };


    /* ============================================
     * 🔥 렌더링 데이터
     * ============================================ */
    const title = mission?.title ?? "불러오는 중...";
    const address = mission?.address ?? "불러오는 중...";
    const desc = mission?.content ?? "";

    const vehicleCallSign =
        mission?.batches?.[0]?.vehicles?.find((v) => String(v.id) === vehicleId)
            ?.callSign ?? vehicleId;

    return (
        <div className="w-full min-h-screen flex justify-center bg-gray-50">
            <div className="w-full max-w-xl p-5 flex flex-col justify-between h-screen">

                <div className="flex flex-col items-center mt-10">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-6">출동지 정보</h2>

                    <div className="bg-white w-full rounded-xl shadow p-5 text-center space-y-5">

                        <div>
                            <p className="text-lg font-medium text-gray-600">출동 제목</p>
                            <p className="text-2xl font-semibold text-gray-900">{title}</p>
                        </div>

                        <div>
                            <p className="text-lg font-medium text-gray-600">주소</p>
                            <p className="text-xl font-semibold">{address}</p>
                        </div>

                        <div>
                            <p className="text-lg font-medium text-gray-600">출동 내용</p>
                            <p className="text-lg text-gray-700 whitespace-pre-line">{desc}</p>
                        </div>

                        <hr />

                        <p className="text-gray-700">
                            🚒 차량 호출명:{" "}
                            <span className="font-semibold">{vehicleCallSign}</span>
                        </p>

                        <p className="mt-2 text-sm text-gray-600">
                            📡 GPS 상태: {gpsStatus}
                            <br />
                            현재 위치: {lat}, {lon}
                        </p>
                    </div>
                </div>

                <div className="mb-10">
                    <button
                        onClick={endMission}
                        className="bg-gray-800 text-white w-full py-4 rounded-xl text-xl font-bold shadow-md active:scale-95 transition"
                    >
                        상황 종료
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GPSStatus;
