import { useEffect, useRef, useState, type RefObject } from "react";
import {
    clearRadarTileBlobCache,
    enqueueRadarTileLoad,
    getRadarTileCacheSize,
    resetRadarTileLoader,
} from "../services/weather/radarTileLoader";
import {
    applyRadarTileStyle,
    buildRadarTileUrl,
    fetchLatestRadarTilePath,
    getVisibleTileRange,
    latLngToTileXY,
    markRadarTileVisible,
    positionRadarTile,
    resolveTileZoom,
    sortTilesByCenter,
} from "../services/weather/radarTiles";

type KakaoMapLike = {
    getLevel(): number;
    getCenter(): { getLat(): number; getLng(): number };
    getBounds(): {
        getSouthWest(): { getLat(): number; getLng(): number };
        getNorthEast(): { getLat(): number; getLng(): number };
    };
    getProjection(): {
        containerPointFromCoords(latlng: {
            getLat(): number;
            getLng(): number;
        }): { x: number; y: number };
    };
};

type TileRecord = {
    img: HTMLImageElement;
    zoom: number;
    x: number;
    y: number;
};

type SyncAnchor = {
    lat: number;
    lng: number;
    px: { x: number; y: number };
};

function tileKey(zoom: number, x: number, y: number) {
    return `${zoom}:${x}:${y}`;
}

function buildSyncSignature(
    path: string,
    zoom: number,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number
) {
    return `${path}|${zoom}|${minX},${maxX},${minY},${maxY}`;
}

export function useKakaoRadarOverlay(
    map: KakaoMapLike | null,
    mapContainerRef: RefObject<HTMLElement | null>,
    enabled: boolean
) {
    const paneRef = useRef<HTMLDivElement | null>(null);
    const tilesLayerRef = useRef<HTMLDivElement | null>(null);
    const tilesRef = useRef<Map<string, TileRecord>>(new Map());
    const radarPathRef = useRef<string | null>(null);
    const lockedZoomRef = useRef<number | null>(null);
    const syncAnchorRef = useRef<SyncAnchor | null>(null);
    const lastSyncSignatureRef = useRef("");
    const lastMapLevelRef = useRef<number | null>(null);
    const rafRef = useRef<number>(0);
    const syncTimerRef = useRef<number | null>(null);
    const syncGenRef = useRef(0);
    const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
    const [error, setError] = useState("");

    useEffect(() => {
        const container = mapContainerRef.current;

        if (!map || !enabled || !container) {
            resetRadarTileLoader();
            clearRadarTileBlobCache();
            tilesRef.current.forEach(({ img }) => img.remove());
            tilesRef.current.clear();
            paneRef.current?.remove();
            paneRef.current = null;
            tilesLayerRef.current = null;
            lockedZoomRef.current = null;
            syncAnchorRef.current = null;
            lastSyncSignatureRef.current = "";
            lastMapLevelRef.current = null;
            if (!enabled) {
                setStatus("idle");
                setError("");
            }
            return;
        }

        const kakao = window.kakao;

        const pane = document.createElement("div");
        pane.className = "forecast-radar-overlay";
        pane.style.cssText =
            "position:absolute;inset:0;pointer-events:none;z-index:2;overflow:visible;transform:translate3d(0,0,0);will-change:transform;";

        const tilesLayer = document.createElement("div");
        tilesLayer.className = "forecast-radar-tiles";
        tilesLayer.style.cssText =
            "position:absolute;inset:0;pointer-events:none;transform:translate3d(0,0,0);";
        pane.appendChild(tilesLayer);

        container.appendChild(pane);
        paneRef.current = pane;
        tilesLayerRef.current = tilesLayer;

        let cancelled = false;

        const resetPaneTransform = () => {
            if (paneRef.current) {
                paneRef.current.style.transform = "translate3d(0,0,0)";
            }
        };

        const updateSyncAnchor = () => {
            const center = map.getCenter();
            const projection = map.getProjection();
            const px = projection.containerPointFromCoords(center);
            syncAnchorRef.current = {
                lat: center.getLat(),
                lng: center.getLng(),
                px: { x: px.x, y: px.y },
            };
        };

        const positionAllTiles = () => {
            if (!paneRef.current) return;
            const projection = map.getProjection();
            tilesRef.current.forEach(({ img, zoom, x, y }) => {
                positionRadarTile(img, projection, zoom, x, y);
            });
        };

        const applyPanTransform = () => {
            const anchor = syncAnchorRef.current;
            if (!anchor || !paneRef.current) return;

            const projection = map.getProjection();
            const latlng = new kakao.maps.LatLng(anchor.lat, anchor.lng);
            const nowPx = projection.containerPointFromCoords(latlng);
            const dx = nowPx.x - anchor.px.x;
            const dy = nowPx.y - anchor.px.y;
            paneRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        };

        const schedulePosition = () => {
            if (rafRef.current) return;
            rafRef.current = window.requestAnimationFrame(() => {
                rafRef.current = 0;
                applyPanTransform();
            });
        };

        const attachTileListeners = (img: HTMLImageElement) => {
            const onLoaded = () => markRadarTileVisible(img);
            img.addEventListener("radartileloaded", onLoaded);
            img.addEventListener("load", onLoaded);
            if (img.complete && img.naturalWidth > 0) onLoaded();
        };

        const syncTiles = async () => {
            if (!paneRef.current || !tilesLayerRef.current || cancelled) return;

            const gen = ++syncGenRef.current;

            try {
                setStatus((s) => (s === "ready" ? "ready" : "loading"));

                const prevPath = radarPathRef.current;
                if (!radarPathRef.current) {
                    radarPathRef.current = await fetchLatestRadarTilePath();
                }
                if (cancelled || gen !== syncGenRef.current) return;

                const path = radarPathRef.current;
                if (prevPath && prevPath !== path && getRadarTileCacheSize() > 0) {
                    clearRadarTileBlobCache();
                }

                const center = map.getCenter();
                const projection = map.getProjection();
                const mapLevel = map.getLevel();

                const levelJump =
                    lastMapLevelRef.current != null &&
                    Math.abs(mapLevel - lastMapLevelRef.current) >= 2;
                if (levelJump) {
                    lockedZoomRef.current = null;
                }
                lastMapLevelRef.current = mapLevel;

                const preferredZoom = resolveTileZoom(
                    projection,
                    center.getLat(),
                    center.getLng(),
                    mapLevel,
                    lockedZoomRef.current
                );

                const bounds = map.getBounds();
                const range = getVisibleTileRange(
                    projection,
                    bounds.getSouthWest(),
                    bounds.getNorthEast(),
                    preferredZoom
                );
                const { zoom, minX, maxX, minY, maxY } = range;
                lockedZoomRef.current = zoom;

                const signature = buildSyncSignature(path, zoom, minX, maxX, minY, maxY);
                if (signature === lastSyncSignatureRef.current) {
                    resetPaneTransform();
                    updateSyncAnchor();
                    positionAllTiles();
                    if (!cancelled && gen === syncGenRef.current) setStatus("ready");
                    return;
                }

                lastSyncSignatureRef.current = signature;
                resetPaneTransform();
                updateSyncAnchor();

                const centerTile = latLngToTileXY(center.getLat(), center.getLng(), zoom);
                const coords: { x: number; y: number }[] = [];
                for (let x = minX; x <= maxX; x += 1) {
                    for (let y = minY; y <= maxY; y += 1) {
                        coords.push({ x, y });
                    }
                }

                const ordered = sortTilesByCenter(coords, centerTile.x, centerTile.y);
                const needed = new Set<string>();

                for (const { x, y } of ordered) {
                    const key = tileKey(zoom, x, y);
                    needed.add(key);

                    let record = tilesRef.current.get(key);
                    if (!record) {
                        const img = document.createElement("img");
                        img.alt = "";
                        applyRadarTileStyle(img);
                        attachTileListeners(img);
                        tilesLayerRef.current.appendChild(img);
                        record = { img, zoom, x, y };
                        tilesRef.current.set(key, record);
                    }

                    positionRadarTile(record.img, projection, zoom, x, y);
                    enqueueRadarTileLoad(
                        record.img,
                        buildRadarTileUrl(path, zoom, x, y)
                    );
                }

                tilesRef.current.forEach((record, key) => {
                    if (!needed.has(key)) {
                        record.img.remove();
                        tilesRef.current.delete(key);
                    }
                });

                if (!cancelled && gen === syncGenRef.current) {
                    setStatus("ready");
                    setError("");
                }
            } catch (e) {
                if (!cancelled && gen === syncGenRef.current) {
                    console.error("레이더 오버레이 오류:", e);
                    setStatus("error");
                    setError("레이더를 불러오지 못했습니다. 잠시 후 다시 켜 주세요.");
                }
            }
        };

        const scheduleSync = (delayMs = 0) => {
            if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
            syncTimerRef.current = window.setTimeout(() => {
                syncTimerRef.current = null;
                void syncTiles();
            }, delayMs);
        };

        const onCenterChanged = () => {
            schedulePosition();
        };

        const onZoomChanged = () => {
            lockedZoomRef.current = null;
            lastSyncSignatureRef.current = "";
            resetPaneTransform();
            scheduleSync(700);
        };

        const onIdle = () => {
            scheduleSync(400);
        };

        void syncTiles();
        kakao.maps.event.addListener(map as never, "center_changed", onCenterChanged);
        kakao.maps.event.addListener(map as never, "zoom_changed", onZoomChanged);
        kakao.maps.event.addListener(map as never, "drag", schedulePosition);
        kakao.maps.event.addListener(map as never, "dragend", onIdle);
        kakao.maps.event.addListener(map as never, "idle", onIdle);

        const refreshTimer = window.setInterval(async () => {
            try {
                const prev = radarPathRef.current;
                radarPathRef.current = null;
                const next = await fetchLatestRadarTilePath();
                if (cancelled) return;
                if (prev !== next) {
                    lastSyncSignatureRef.current = "";
                    clearRadarTileBlobCache();
                    scheduleSync(0);
                }
            } catch {
                /* 다음 주기에 재시도 */
            }
        }, 10 * 60 * 1000);

        return () => {
            cancelled = true;
            resetRadarTileLoader();
            clearRadarTileBlobCache();
            window.clearInterval(refreshTimer);
            if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
            if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
            kakao.maps.event.removeListener(map as never, "center_changed", onCenterChanged);
            kakao.maps.event.removeListener(map as never, "zoom_changed", onZoomChanged);
            kakao.maps.event.removeListener(map as never, "drag", schedulePosition);
            kakao.maps.event.removeListener(map as never, "dragend", onIdle);
            kakao.maps.event.removeListener(map as never, "idle", onIdle);
            tilesRef.current.forEach(({ img }) => img.remove());
            tilesRef.current.clear();
            paneRef.current?.remove();
            paneRef.current = null;
            tilesLayerRef.current = null;
            lockedZoomRef.current = null;
            syncAnchorRef.current = null;
            lastSyncSignatureRef.current = "";
            lastMapLevelRef.current = null;
        };
    }, [map, mapContainerRef, enabled]);

    return { status, error };
}
