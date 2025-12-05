/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */


export { };

declare global {
    interface Window {
        /** 카카오맵 SDK는 런타임 로드 → any 처리 필수 */
        kakao: any;
    }
}

/** 전역 kakao 네임스페이스 선언 */
declare namespace kakao {
    namespace maps {
        /** ============================
         *  기본 좌표 클래스
         * ============================ */
        class LatLng {
            constructor(lat: number, lng: number);
            getLat(): number;
            getLng(): number;
        }

        class LatLngBounds {
            constructor(sw?: LatLng, ne?: LatLng);
            extend(latlng: LatLng): void;
            contain(latlng: LatLng): boolean;
        }

        /** ============================
         *  Map
         * ============================ */
        interface MapOptions {
            center: LatLng;
            level?: number;
        }

        class Map {
            constructor(container: HTMLElement, options: MapOptions);

            setCenter(latlng: LatLng): void;
            panTo(latlng: LatLng): void;

            getBounds(): LatLngBounds;
            setBounds(bounds: LatLngBounds): void;

            getLevel(): number;
        }

        /** ============================
         *  Marker
         * ============================ */
        class Marker {
            constructor(options: {
                map?: Map | null;
                position: LatLng;
                image?: MarkerImage;
            });

            setMap(map: Map | null): void;
            getPosition(): LatLng;
            setPosition(latlng: LatLng): void;
        }

        class MarkerImage {
            constructor(src: string, size: Size, options?: any);
        }

        class Size {
            constructor(width: number, height: number);
        }

        /** ============================
         *  Polyline (경로선)
         * ============================ */
        class Polyline {
            constructor(options: {
                path: LatLng[];
                map?: Map | null;
                strokeWeight?: number;
                strokeColor?: string;
                strokeOpacity?: number;
                strokeStyle?: string;
            });

            setMap(map: Map | null): void;
            setPath(path: LatLng[]): void;
        }

        /** ============================
         *  Polygon / Rectangle
         * ============================ */
        class Polygon {
            constructor(options: {
                map: Map | null;
                path: LatLng[];
                strokeWeight?: number;
                strokeColor?: string;
                strokeOpacity?: number;
                fillColor?: string;
                fillOpacity?: number;
            });

            setMap(map: Map | null): void;
            getPath(): LatLng[];
        }

        class Rectangle {
            constructor(options: {
                map: Map;
                bounds: LatLngBounds;
                strokeWeight: number;
                strokeColor: string;
                strokeOpacity: number;
                fillColor: string;
                fillOpacity: number;
            });

            setBounds(bounds: LatLngBounds): void;
            setMap(map: Map | null): void;
            getBounds(): LatLngBounds;
        }

        /** ============================
         *  이벤트
         * ============================ */
        namespace event {
            interface MapMouseEvent {
                latLng: LatLng;
            }

            function addListener(
                target: any,
                type: string,
                handler: (evt?: MapMouseEvent) => void
            ): void;

            function removeListener(
                target: any,
                type: string,
                handler: (evt?: MapMouseEvent) => void
            ): void;
        }

        /** ============================
         *  서비스 (Geocoder)
         * ============================ */
        namespace services {
            class Geocoder {
                addressSearch(
                    query: string,
                    callback: (result: any[], status: Status) => void
                ): void;

                coord2RegionCode(
                    lng: number,
                    lat: number,
                    callback: (result: any[], status: Status) => void
                ): void;
            }

            enum Status {
                OK = "OK"
            }
        }

        /** SDK 로드 */
        function load(callback: () => void): void;
    }
}

export { };
