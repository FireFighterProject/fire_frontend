// src/components/Dispatch/KakaoMapModal.tsx
import React, { useEffect } from "react";

type SelectPayload = { address: string; lat: number; lng: number };

type KakaoMapModalProps = {
    onSelect: (sel: SelectPayload) => void; // 주소+좌표 전달
    onClose: () => void;
    initialCenter?: { lat: number; lng: number }; // 시작 중심점(옵션)
};

/** coord2Address 콜백 결과 최소 타입(프로젝트 d.ts에 없을 수 있음) */
type Coord2AddressResult = {
    address?: { address_name?: string };
    road_address?: { address_name?: string };
};

/** d.ts에 없는 coord2Address를 보강해 사용 */
type GeocoderWithCoord2Address = kakao.maps.services.Geocoder & {
    coord2Address: (
        x: number,
        y: number,
        cb: (result: Coord2AddressResult[], status: kakao.maps.services.Status) => void
    ) => void;
};

/** d.ts에 setPosition이 없을 수 있어 보강 */
type MarkerWithSetPosition = kakao.maps.Marker & {
    setPosition?: (latlng: kakao.maps.LatLng) => void;
};

const KakaoMapModal: React.FC<KakaoMapModalProps> = ({ onSelect, onClose, initialCenter }) => {
    useEffect(() => {
        const KEY = import.meta.env.VITE_KAKAOMAP_API_KEY as string | undefined;
        if (!KEY) {
            console.error("Kakao Map API Key missing. Add VITE_KAKAOMAP_API_KEY in .env.local");
            onClose();
            return;
        }

        const SDK_ID = "kakao-maps-sdk";
        const existing = document.getElementById(SDK_ID) as HTMLScriptElement | null;

        let removeListener: (() => void) | undefined;

        const init = () => {
            window.kakao!.maps.load(() => {
                const container = document.getElementById("map");
                if (!container) return;

                const center = new window.kakao!.maps.LatLng(
                    initialCenter?.lat ?? 37.5665,
                    initialCenter?.lng ?? 126.9780
                );
                const map = new window.kakao!.maps.Map(container, { center, level: 3 });

                // 컨트롤(옵션)
                map.addControl(new window.kakao!.maps.ZoomControl(), window.kakao!.maps.ControlPosition.RIGHT);
                map.addControl(new window.kakao!.maps.MapTypeControl(), window.kakao!.maps.ControlPosition.TOPRIGHT);

                const geocoder = new window.kakao!.maps.services.Geocoder() as GeocoderWithCoord2Address;

                // ✅ d.ts에서 position 필수라 초기 위치(center)로 생성
                let marker: kakao.maps.Marker = new window.kakao!.maps.Marker({
                    map,
                    position: center,
                });

                const handleClick = (mouseEvent: kakao.maps.event.MapMouseEvent) => {
                    const latlng = mouseEvent.latLng;

                    // setPosition이 d.ts에 없을 수 있어 보강 타입으로 안전 호출
                    const mk = marker as MarkerWithSetPosition;
                    if (typeof mk.setPosition === "function") {
                        mk.setPosition(latlng);
                    } else {
                        // 폴백: 기존 마커 제거 후 새로 생성
                        (marker as unknown as { setMap: (m: kakao.maps.Map | null) => void }).setMap(null);
                        marker = new window.kakao!.maps.Marker({ map, position: latlng });
                    }

                    // d.ts에 없을 수 있는 coord2Address도 보강 타입으로 호출
                    if (typeof geocoder.coord2Address === "function") {
                        geocoder.coord2Address(
                            latlng.getLng(),
                            latlng.getLat(),
                            (result: Coord2AddressResult[], status: kakao.maps.services.Status) => {
                                if (status === window.kakao!.maps.services.Status.OK && result.length > 0) {
                                    const item = result[0];
                                    const address =
                                        item.road_address?.address_name ??
                                        item.address?.address_name ??
                                        "";
                                    onSelect({ address, lat: latlng.getLat(), lng: latlng.getLng() });
                                }
                            }
                        );
                    }
                };

                window.kakao!.maps.event.addListener(map, "click", handleClick);
                removeListener = () => {
                    window.kakao!.maps.event.removeListener(map, "click", handleClick);
                };
            });
        };

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

        return () => {
            if (removeListener) removeListener();
        };
    }, [onSelect, onClose, initialCenter]);

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
