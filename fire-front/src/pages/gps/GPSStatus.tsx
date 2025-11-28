import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "@/api/axios";

const GPSStatus = () => {
    const [params] = useSearchParams();
    const missionId = params.get("missionId");

    const [mission, setMission] = useState<any>(null);

    // 🔥 1) 서버에서 출동지 주소 받아오기
    useEffect(() => {
        api.get(`/dispatch/mission/${missionId}`)
            .then((res) => {
                setMission(res.data); // { address: "...", vehicle: 3, ... }
            })
            .catch(() => {
                alert("출동 정보를 불러올 수 없습니다.");
            });
    }, []);

    // 🔥 2) 상황 종료 버튼
    const endMission = async () => {
        await api.post("/dispatch/end", { missionId });

        alert("노고에 감사드립니다.");
        window.close();
    };

    return (
        <div className="p-6 text-center flex flex-col justify-between h-screen">
            <div>
                <h2 className="text-xl font-bold mb-4">출동지 정보</h2>

                <p className="text-lg mb-2">출동지 주소</p>
                <p className="text-xl font-semibold mb-6">
                    {mission?.address || "불러오는 중..."}
                </p>

                <p className="text-sm text-gray-600">
                    차량 번호: {mission?.vehicle || "불러오는 중..."}
                </p>
            </div>

            <button
                onClick={endMission}
                className="bg-gray-800 text-white p-4 rounded-lg mb-4"
            >
                상황 종료
            </button>
        </div>
    );
};

export default GPSStatus;
