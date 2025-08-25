import { useEffect, useState } from "react";

export function useKakaoLoader(): boolean {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const KEY = import.meta.env.VITE_KAKAOMAP_API_KEY as string | undefined;
        if (!KEY) {
            console.error("VITE_KAKAOMAP_API_KEY가 .env에 없습니다.");
            return;
        }
        const id = "kakao-maps-sdk";
        const exist = document.getElementById(id) as HTMLScriptElement | null;

        const handleLoaded = () => window.kakao.maps.load(() => setReady(true));

        if (exist) {
            // 이미 스크립트가 있으면: kakao.maps.load가 준비된 경우 바로 load 콜
            if (typeof window.kakao?.maps?.load === "function") {
                handleLoaded();
            } else {
                exist.addEventListener("load", handleLoaded, { once: true });
            }
            return;
        }

        const s = document.createElement("script");
        s.id = id;
        s.async = true;
        s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false&libraries=services`;
        s.onload = handleLoaded;
        s.onerror = () => console.error("Kakao Maps SDK 로딩 실패");
        document.head.appendChild(s);
    }, []);

    return ready;
}
