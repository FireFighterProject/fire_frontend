// src/pages/GPSStandby.tsx
const GPSStandby = () => {
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
