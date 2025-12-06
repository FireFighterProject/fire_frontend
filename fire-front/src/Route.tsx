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
// import GPSStatus from "./pages/gps/GPSStatus";
import GPSReady from "./pages/gps/GPSReady";
import GPSStandby from "./pages/gps/GPSStandby";
import NavigationPage from "./pages/gps/NavigationPage";
import AssemblyRequest from "./pages/gps/AssemblyRequest";
import AssemblyNavigationPage from "./pages/gps/AssemblyNavigation";

export default function AppRoutes() {
    return (
        <Routes>
            //==========================================================
            {/*관리리용*/}
            //==========================================================
            <Route path="/" element={<Home />} />
            <Route path="/status" element={<Status />} />
            <Route path="/manage" element={<Manage />} />
            <Route path="/dispatch" element={<Dispatch />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/report" element={<Report />} />


        

            //==========================================================
            {/* 소방차용용 */}
            //==========================================================
            <Route path="/gps/assemblynav" element={<AssemblyNavigationPage />} />
            <Route path="/gps/assembly" element={<AssemblyRequest />} />
            <Route path="/gps/ready" element={<GPSReady />} />
            <Route path="/gps/standby" element={<GPSStandby />} />
            <Route path="/map/navigation" element={<NavigationPage />} />
            {/* <Route path="/gps/status" element={<GPSStatus />} />     */}

            {/* 404 */}
            <Route path="*" element={<div className="p-4">페이지를 찾을 수 없습니다.</div>} />
        </Routes>
    );
}
