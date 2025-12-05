// src/App.tsx
import "./index.css";
import Header from "./components/header/Header";
import Toggle from "./components/emergencyToggle/Togglebut";
import AppRoutes from "./Route";
import { Provider } from "react-redux";
import { store } from "./store";
import { useAppDispatch, useAppSelector } from "./hooks";
import { setIsDisaster } from "./features/emergency/emergencySlice";
import { useLocation } from "react-router-dom";

function GlobalEmergencyToggle() {
  const isDisaster = useAppSelector((s) => s.emergency.isDisaster);
  const dispatch = useAppDispatch();

  return (
    <div className="px-4 py-2 flex items-center">
      <Toggle
        label="재난모드"
        checked={isDisaster}
        onChange={(v: boolean) => dispatch(setIsDisaster(v))}
      />
    </div>
  );
}

export default function App() {
  const location = useLocation();

  // 기존 숨김 조건
  const hideToggle =
    /^\/(map|statistics|report)\b/.test(location.pathname) ||
    location.pathname === "/";

  // 🔥 GPS 페이지에서는 Header + Toggle 둘 다 숨김
  const isGPSPage =
    location.pathname.startsWith("/map/navigation") ||
    location.pathname.startsWith("/gps/standby") ||
    location.pathname.startsWith("/gps/ready") ||
    location.pathname.startsWith("/gps/status");

  return (
    <Provider store={store}>
      {/* 헤더 숨기기 */}
      {!isGPSPage && <Header />}

      {/* 재난 토글 숨기기 */}
      {!isGPSPage && !hideToggle && <GlobalEmergencyToggle />}

      <AppRoutes />
    </Provider>
  );
}
