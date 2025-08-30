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

  // 📌 /map 경로에서는 재난모드 버튼 숨기기
  const hideToggle = location.pathname.startsWith("/map");

  return (
    <Provider store={store}>
      <Header />
      {!hideToggle && <GlobalEmergencyToggle />}
      <AppRoutes />
    </Provider>
  );
}
