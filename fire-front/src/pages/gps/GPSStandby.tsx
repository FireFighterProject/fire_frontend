// src/pages/GPSStandby.tsx
import { useEffect } from "react";
const GPSStandby = () => {

    // 🔒 브라우저 종료 방지 - GPS 추적 중 보호
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = ""; // Chrome 기준 필수
        };

        // GPS 추적 시작 → 종료 방지 활성화
        window.addEventListener("beforeunload", handler);

        return () => {
            // 페이지 떠날 때 자동 해제
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
