import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../api/axios";

const GPSStatus = () => {
    const [params] = useSearchParams();
    const missionId = params.get("missionId");

    // 🔥 URL에서 받은 값들
    const title = params.get("title") ?? "";
    const address = params.get("address") ?? "";
    const desc = params.get("desc") ?? "";
    const vehicle = params.get("vehicle") ?? "";

    const [mission, setMission] = useState<any>(null);

    // 🔥 서버에서 추가 정보 받아오기 (선택)
    useEffect(() => {
        api.get(`/dispatch/mission/${missionId}`)
            .then((res) => setMission(res.data))
            .catch(() => alert("출동 정보를 불러올 수 없습니다."));
    }, []);

    const endMission = async () => {
        await api.post("/dispatch/end", { missionId });
        alert("노고에 감사드립니다.");
        window.close();
    };

    return (
        <div className="w-full min-h-screen flex justify-center bg-gray-50">
            <div className="w-full max-w-xl p-5 sm:p-6 md:p-8 flex flex-col justify-between h-screen">

                {/* 상단 정보 */}
                <div className="flex flex-col items-center mt-10 sm:mt-16">

                    <h2 className="text-2xl sm:text-3xl font-bold mb-6">출동지 정보</h2>

                    <div className="bg-white w-full rounded-xl shadow p-5 sm:p-6 text-center space-y-5">

                        {/* 제목 */}
                        <div>
                            <p className="text-sm sm:text-lg font-medium text-gray-600">출동 제목</p>
                            <p className="text-xl sm:text-2xl font-semibold text-gray-900">{title}</p>
                        </div>

                        {/* 주소 */}
                        <div>
                            <p className="text-sm sm:text-lg font-medium text-gray-600">주소</p>
                            <p className="text-lg sm:text-xl font-semibold">
                                {address || mission?.address || "불러오는 중..."}
                            </p>
                        </div>

                        {/* 내용 */}
                        <div>
                            <p className="text-sm sm:text-lg font-medium text-gray-600">출동 내용</p>
                            <p className="text-base sm:text-lg text-gray-700 whitespace-pre-line">
                                {desc}
                            </p>
                        </div>

                        <hr />

                        {/* 차량 번호 */}
                        <p className="text-gray-700 text-sm sm:text-base">
                            🚒 차량 번호:{" "}
                            <span className="font-semibold">
                                {vehicle || mission?.vehicle || "-"}
                            </span>
                        </p>
                    </div>
                </div>

                {/* 하단 버튼 */}
                <div className="mb-10 sm:mb-14">
                    <button
                        onClick={endMission}
                        className="
                            bg-gray-800 text-white w-full py-4 
                            rounded-xl text-lg sm:text-xl font-bold 
                            shadow-md active:scale-95 transition
                        "
                    >
                        상황 종료
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GPSStatus;
