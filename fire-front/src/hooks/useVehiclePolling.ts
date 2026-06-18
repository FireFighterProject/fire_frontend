import { useEffect } from "react";
import { useAppDispatch } from "../hooks";
import { fetchVehicles } from "../features/vehicle/vehicleSlice";

/** 긴급 관제용 차량 목록 자동 갱신 (기본 15초) */
export const VEHICLE_POLL_INTERVAL_MS = 15_000;

export function useVehiclePolling(intervalMs = VEHICLE_POLL_INTERVAL_MS) {
    const dispatch = useAppDispatch();

    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState === "visible") {
                dispatch(fetchVehicles({}));
            }
        };

        refresh();

        const timerId = window.setInterval(refresh, intervalMs);
        document.addEventListener("visibilitychange", refresh);

        return () => {
            window.clearInterval(timerId);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [dispatch, intervalMs]);
}
