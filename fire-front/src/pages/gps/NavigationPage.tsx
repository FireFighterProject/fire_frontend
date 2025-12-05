// src/pages/NavigationPage.tsx
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

declare global {
    interface Window {
        kakao: any;
    }
}

type Step = {
    distance: number;
    duration: number;
    maneuver: {
        type: string;
        modifier?: string;
    };
};

const NavigationPage = () => {
    const [params] = useSearchParams();

    const startLat = Number(params.get("startLat"));
    const startLon = Number(params.get("startLon"));
    const destAddress = params.get("dest") ?? "";

    const mapRef = useRef<HTMLDivElement | null>(null);
    const markerRef = useRef<any>(null);

    const [map, setMap] = useState<any>(null);
    const [routeSteps, setRouteSteps] = useState<Step[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [remainDistance, setRemainDistance] = useState(0);
    const [speed, setSpeed] = useState(0);
    const [eta, setEta] = useState("");

    /** =============================================
     * 0) Kakao 지도 SDK 로드
     * ============================================ */
    const loadKakaoSDK = () =>
        new Promise<void>((resolve) => {
            if (window.kakao?.maps) return resolve();

            const script = document.createElement("script");
            script.src = `https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=${import.meta.env.VITE_KAKAOMAP_API_KEY
                }&libraries=services`;
            script.onload = () => window.kakao.maps.load(() => resolve());
            document.head.appendChild(script);
        });

    /** =============================================
     * 1) 지도 생성
     * ============================================ */
    useEffect(() => {
        (async () => {
            await loadKakaoSDK();
            if (!mapRef.current) return;

            const kakao = window.kakao;
            const m = new kakao.maps.Map(mapRef.current, {
                center: new kakao.maps.LatLng(startLat, startLon),
                level: 4,
            });

            setMap(m);

            const icon = new kakao.maps.MarkerImage(
                "https://cdn-icons-png.flaticon.com/512/684/684908.png",
                new kakao.maps.Size(42, 42),
                { offset: new kakao.maps.Point(21, 21) }
            );

            markerRef.current = new kakao.maps.Marker({
                map: m,
                position: new kakao.maps.LatLng(startLat, startLon),
                image: icon,
            });
        })();
    }, []);

    /** =============================================
     * 2) 목적지 주소 → 좌표 변환
     * ============================================ */
    const geocodeAddress = () =>
        new Promise<{ lat: number; lon: number }>((resolve, reject) => {
            const geocoder = new window.kakao.maps.services.Geocoder();

            geocoder.addressSearch(destAddress, (result: any, status: string) => {
                if (status === window.kakao.maps.services.Status.OK) {
                    resolve({
                        lat: Number(result[0].y),
                        lon: Number(result[0].x),
                    });
                } else reject("주소 변환 실패");
            });
        });

    /** =============================================
     * 3) OSRM 경로 요청
     * ============================================ */
    const requestRoute = async (destLat: number, destLon: number) => {
        const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${destLon},${destLat}?overview=full&steps=true&geometries=geojson`;

        const res = await fetch(url);
        const data = await res.json();
        const route = data.routes[0];

        setRemainDistance(route.distance);

        return route;
    };

    /** =============================================
     * 4) 경로 시각화
     * ============================================ */
    const drawRoute = (geometry: any) => {
        const kakao = window.kakao;
        const path = geometry.coordinates.map(
            (c: any) => new kakao.maps.LatLng(c[1], c[0])
        );

        const polyline = new kakao.maps.Polyline({
            path,
            strokeWeight: 7,
            strokeColor: "#3478F6",
            strokeOpacity: 0.9,
        });

        polyline.setMap(map);

        const bounds = new kakao.maps.LatLngBounds();
        path.forEach((p: any) => bounds.extend(p));
        map.setBounds(bounds);
    };

    /** =============================================
     * 5) 음성 안내
     * ============================================ */
    function speak(text: string) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "ko-KR";
        u.rate = 1;
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
    }

    /** 턴 안내 문구 생성 */
    function getInstruction(step: Step) {
        const mod = step.maneuver.modifier;

        if (mod === "left") return "좌회전하세요.";
        if (mod === "right") return "우회전하세요.";
        if (mod === "straight") return "직진하세요.";
        if (mod === "uturn") return "유턴하세요.";

        return "경로를 따라 이동하세요.";
    }

    /** =============================================
     * 6) 전체 경로 계산
     * ============================================ */
    useEffect(() => {
        if (!map) return;

        (async () => {
            const dest = await geocodeAddress();
            const route = await requestRoute(dest.lat, dest.lon);

            drawRoute(route.geometry);

            setRouteSteps(route.legs[0].steps);
            speak("경로 안내를 시작합니다.");
        })();
    }, [map]);

    /** =============================================
     * 7) GPS 실시간 업데이트
     * ============================================ */
    useEffect(() => {
        if (!map || routeSteps.length === 0) return;

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                const spd = pos.coords.speed ?? 0;

                setSpeed(spd * 3.6); // km/h

                const kakao = window.kakao;
                const newPos = new kakao.maps.LatLng(lat, lon);

                markerRef.current.setPosition(newPos);

                map.panTo(newPos);

                /** ===== 이동에 따라 턴 체크 ===== */
                const step = routeSteps[currentStepIndex];

                if (!step) return;

                const distToNext = step.distance;

                if (distToNext < 120 && currentStepIndex < routeSteps.length - 1) {
                    speak(getInstruction(step));
                    setCurrentStepIndex(currentStepIndex + 1);
                }

                /** 전체 거리 갱신 */
                setRemainDistance((prev) => Math.max(prev - spd, 0));

                /** ETA 계산 */
                const etaMin = Math.round((remainDistance / (spd * 3.6)) || 0);
                setEta(`${etaMin}분 후 도착`);
            },
            (err) => console.error(err),
            { enableHighAccuracy: true }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [routeSteps, currentStepIndex, remainDistance]);

    /** =============================================
     * UI 렌더링
     * ============================================ */
    const nextStep = routeSteps[currentStepIndex];

    return (
        <div className="w-full h-screen relative">
            {/* 상단 안내 패널 */}
            <div className="absolute top-0 left-0 w-full bg-black bg-opacity-70 text-white p-4 z-10">
                <div className="text-xl font-bold">
                    {nextStep ? getInstruction(nextStep) : "경로 이탈 시 재탐색합니다."}
                </div>

                <div className="text-sm opacity-80 mt-1">
                    남은 거리: {remainDistance.toFixed(0)}m
                    &nbsp;|&nbsp; 속도: {speed.toFixed(0)} km/h
                    &nbsp;|&nbsp; ETA: {eta}
                </div>
            </div>

            {/* 지도 */}
            <div ref={mapRef} className="w-full h-full" />

        </div>
    );
};

export default NavigationPage;
