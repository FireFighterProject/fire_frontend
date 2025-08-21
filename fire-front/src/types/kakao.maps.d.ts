export { };

declare global {
    namespace kakao {
        namespace maps {
            function load(cb: () => void): void;

            class LatLng {
                constructor(lat: number, lng: number);
                getLat(): number;
                getLng(): number;
            }

            interface MapOptions { center: LatLng; level: number; }
            class Map { constructor(container: HTMLElement, options: MapOptions); }

            namespace event {
                interface MouseEvent { latLng: LatLng; }
                function addListener(target: Map, type: "click", handler: (ev: MouseEvent) => void): void;
                function removeListener(target: Map, type: "click", handler: (ev: MouseEvent) => void): void;
            }

            namespace services {
                const Status: { OK: string; };

                interface Address { address_name: string; }
                /** ✅ coord2Address 전용 결과 아이템 */
                interface Coord2AddressItem {
                    address: Address;                // 지번
                    road_address: Address | null;    // 도로명(없을 수 있음)
                }

                class Geocoder {
                    coord2Address(
                        x: number,
                        y: number,
                        callback: (result: Coord2AddressItem[], status: string) => void
                    ): void;
                }
            }
        }
    }

    /** ✅ 로드 전엔 없을 수 있으므로 optional */
    interface Window { kakao?: typeof kakao; }
}
