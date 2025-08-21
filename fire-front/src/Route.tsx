// src/routes/AppRoutes.tsx
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Status from "./pages/Status";
import Manage from "./pages/manage";
import Dispatch from "./pages/Dispatch";
import Activity from "./pages/Activity";
import MapPage from "./pages/MapPage";
import Statistics from "./pages/Statistics";
import Report from "./pages/Report";

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/status" element={<Status />} />
            <Route path="/manage" element={<Manage />} />
            <Route path="/dispatch" element={<Dispatch />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/report" element={<Report />} />
            {/* 404 */}
            <Route path="*" element={<div className="p-4">페이지를 찾을 수 없습니다.</div>} />
        </Routes>
    );
}
