import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

const Home = lazy(() => import("./pages/Home"));
const Status = lazy(() => import("./pages/Status"));
const Manage = lazy(() => import("./pages/manage"));
const Dispatch = lazy(() => import("./pages/Dispatch"));
const Activity = lazy(() => import("./pages/Activity"));
const MapPage = lazy(() => import("./pages/MapPage"));
const Statistics = lazy(() => import("./pages/Statistics"));
const Report = lazy(() => import("./pages/Report"));
const GPSReady = lazy(() => import("./pages/gps/GPSReady"));
const GPSStandby = lazy(() => import("./pages/gps/GPSStandby"));
const NavigationPage = lazy(() => import("./pages/gps/NavigationPage"));
const AssemblyRequest = lazy(() => import("./pages/gps/AssemblyRequest"));
const AssemblyNavigationPage = lazy(() => import("./pages/gps/AssemblyNavigation"));

function PageLoader() {
    return (
        <div className="flex min-h-[40vh] items-center justify-center text-gray-500">
            로딩 중...
        </div>
    );
}

export default function AppRoutes() {
    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                {/* 관리용 */}
                <Route path="/" element={<Home />} />
                <Route path="/status" element={<Status />} />
                <Route path="/manage" element={<Manage />} />
                <Route path="/dispatch" element={<Dispatch />} />
                <Route path="/activity" element={<Activity />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/statistics" element={<Statistics />} />
                <Route path="/report" element={<Report />} />

                {/* 소방차용 */}
                <Route path="/gps/assemblynav" element={<AssemblyNavigationPage />} />
                <Route path="/gps/assembly" element={<AssemblyRequest />} />
                <Route path="/gps/ready" element={<GPSReady />} />
                <Route path="/gps/standby" element={<GPSStandby />} />
                <Route path="/map/navigation" element={<NavigationPage />} />

                <Route path="*" element={<div className="p-4">페이지를 찾을 수 없습니다.</div>} />
            </Routes>
        </Suspense>
    );
}
