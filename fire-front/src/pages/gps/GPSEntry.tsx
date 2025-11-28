import { useSearchParams, useNavigate } from "react-router-dom";

const GPSEntry = () => {
    const [params] = useSearchParams();
    const missionId = params.get("missionId");
    const vehicle = params.get("vehicle");
    const navigate = useNavigate();

    const handleStart = () => {
        navigate(`/gps/start?missionId=${missionId}&vehicle=${vehicle}`);
    };

    return (
        <div className="p-6 flex flex-col justify-center h-screen text-center">
            <h2 className="text-2xl font-bold mb-4">출동 요청이 도착했습니다</h2>

            <p className="text-lg mb-2">차량 번호: {vehicle}호</p>
            <p className="text-lg mb-6">출동 코드: {missionId}</p>

            <button
                onClick={handleStart}
                className="bg-red-600 text-white font-bold p-4 rounded-lg text-xl"
            >
                출동하기 OK
            </button>
        </div>
    );
};

export default GPSEntry;
