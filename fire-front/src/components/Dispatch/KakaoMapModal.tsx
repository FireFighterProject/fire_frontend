    import React, { useEffect } from "react";

    type KakaoMapModalProps = {
        onSelect: (addr: string) => void;
        onClose: () => void;
    };

    const KakaoMapModal: React.FC<KakaoMapModalProps> = ({ onSelect, onClose }) => {
        useEffect(() => {
            const KEY = import.meta.env.VITE_KAKAOMAP_API_KEY as string | undefined; // Vite 환경
            if (!KEY) {
                console.error("Kakao Map API Key missing. Add VITE_KAKAOMAP_API_KEY in .env.local");
                onClose();
                return;
            }

            const SDK_ID = "kakao-maps-sdk";
            const existing = document.getElementById(SDK_ID) as HTMLScriptElement | null;

            const init = () => {
                // autoload=false 초기화
                window.kakao!.maps.load(() => {
                    const container = document.getElementById("map");
                    if (!container) return;

                    const center = new window.kakao!.maps.LatLng(37.5665, 126.9780);
                    const map = new window.kakao!.maps.Map(container, { center, level: 3 });

                    const geocoder = new window.kakao!.maps.services.Geocoder();

                    const handleClick = (mouseEvent: kakao.maps.event.MouseEvent) => {
                        const latlng = mouseEvent.latLng;
                        geocoder.coord2Address(
                            latlng.getLng(),
                            latlng.getLat(),
                            (result, status) => {
                                if (status === window.kakao!.maps.services.Status.OK && result.length > 0) {
                                    // ✅ road_address 우선, 없으면 address 사용
                                    const item = result[0];
                                    const name =
                                        item.road_address?.address_name ?? item.address.address_name;
                                    onSelect(name);
                                }
                            }
                        );
                    };

                    window.kakao!.maps.event.addListener(map, "click", handleClick);

                    // cleanup: 리스너 제거
                    return () => {
                        window.kakao!.maps.event.removeListener(map, "click", handleClick);
                    };
                });
            };

            // 스크립트 주입(중복 방지) + 안전한 존재 체크 (any 사용 안 함)
            if (existing) {
                const kakaoNs = (window as Window).kakao;
                if (typeof kakaoNs?.maps?.load === "function") {
                    init();
                } else {
                    existing.addEventListener("load", init, { once: true });
                }
            } else {
                const script = document.createElement("script");
                script.id = SDK_ID;
                script.async = true;
                script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false&libraries=services`;
                script.addEventListener("load", init, { once: true });
                document.body.appendChild(script);
            }
        }, [onSelect, onClose]);

        return (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
                <div className="bg-white w-[600px] h-[500px] relative rounded shadow">
                    <div id="map" className="w-full h-full" />
                    <button
                        className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded"
                        onClick={onClose}
                    >
                        닫기
                    </button>
                </div>
            </div>
        );
    };

    export default KakaoMapModal;
