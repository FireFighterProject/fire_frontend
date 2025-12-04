// src/pages/Home.tsx
import React, { useState, useEffect } from "react";
import { Activity, Building2, Truck } from "lucide-react";
import Forecast from "../components/Home/Forecast";
import axios from "../api/axios";

const Home: React.FC = () => {
  const [firefighterCount, setFirefighterCount] = useState(0);
  const [activeStations, setActiveStations] = useState(0);
  const [totalVehicles, setTotalVehicles] = useState(0);

  const [targetStats, setTargetStats] = useState({
    firefighterCount: 0,
    activeStations: 0,
    totalVehicles: 0,
  });

  // 📌 1) /api/stats 호출
  const fetchStats = async () => {
    try {
      const res = await axios.get("/stats");
      setTargetStats(res.data); // 애니메이션 목표 값 설정
    } catch (e) {
      console.error("통계 불러오기 실패", e);
    }
  };

  // 📌 2) 숫자 애니메이션
  const animateCount = (target: number, setter: (v: number) => void) => {
    let current = 0;
    const increment = target / 50;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setter(target);
        clearInterval(timer);
      } else {
        setter(Math.floor(current));
      }
    }, 20);
  };

  // 📌 최초 로딩
  useEffect(() => {
    fetchStats();
  }, []);

  // 📌 API 값이 바뀌면 애니메이션 시작
  useEffect(() => {
    animateCount(targetStats.firefighterCount, setFirefighterCount);
    animateCount(targetStats.activeStations, setActiveStations);
    animateCount(targetStats.totalVehicles, setTotalVehicles);
  }, [targetStats]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-8 py-10">

        {/* ===== 상단 통계 카드 3개 ===== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">

          {/* 소방관 수 */}
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 cursor-pointer border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-red-100 p-3 rounded-xl">
                <Activity className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-full">
                ● 실시간
              </div>
            </div>

            <div className="mb-3">
              <div className="text-sm text-gray-500 font-medium mb-2">소방관 수</div>
              <div className="text-5xl font-bold text-gray-900 mb-1">
                {firefighterCount.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400 font-medium">명</div>
            </div>
          </div>

          {/* 활동 소방서 */}
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 cursor-pointer border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-blue-100 p-3 rounded-xl">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                ● 운영 중
              </div>
            </div>

            <div className="mb-3">
              <div className="text-sm text-gray-500 font-medium mb-2">활동 소방서</div>
              <div className="text-5xl font-bold text-gray-900 mb-1">
                {activeStations.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400 font-medium">개소</div>
            </div>
          </div>

          {/* 전체 소방차 */}
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 cursor-pointer border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-orange-100 p-3 rounded-xl">
                <Truck className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-xs font-semibold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full">
                ● 가용
              </div>
            </div>

            <div className="mb-3">
              <div className="text-sm text-gray-500 font-medium mb-2">전체 소방차</div>
              <div className="text-5xl font-bold text-gray-900 mb-1">
                {totalVehicles.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400 font-medium">대</div>
            </div>
          </div>
        </div>

        {/* ===== 일기예보 ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Forecast />
        </div>
      </div>

      {/* ===== 하단 푸터 ===== */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="text-gray-600 text-sm">
              © 2025 통합지휘 관리 프로그램. All rights reserved.
            </div>
            <div className="flex gap-4 text-sm text-gray-500">
              <a href="#" className="hover:text-gray-800 transition-colors">도움말</a>
              <span>|</span>
              <a href="#" className="hover:text-gray-800 transition-colors">문의하기</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
