import React, { useState, useEffect } from "react";
import { Activity, Building2, Truck, Cloud, Bell, MapPin, Droplets, Wind } from "lucide-react";
import Forecast from "../components/Home/Forecast";

interface NoticeItem {
  id: number;
  title: string;
  date: string;
  priority?: 'high' | 'normal';
}

interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
}

interface RegionWeather {
  [key: string]: WeatherData;
}

const Home: React.FC = () => {
  const [firefighterCount, setFirefighterCount] = useState(0);
  const [activeStations, setActiveStations] = useState(0);
  const [totalVehicles, setTotalVehicles] = useState(0);
  const [selectedRegion, setSelectedRegion] = useState("대구");

  const [notices, setNotices] = useState<NoticeItem[]>([
    { id: 1, title: "2025년 상반기 소방 안전 교육 실시 안내", date: "2025-10-20", priority: 'high' },
    { id: 2, title: "긴급 출동 프로토콜 업데이트", date: "2025-10-18", priority: 'high' },
    { id: 3, title: "신규 장비 도입 및 사용법 교육", date: "2025-10-15", priority: 'normal' }
  ]);

  const [regionWeather] = useState<RegionWeather>({
    "대구": { temp: 18, condition: "맑음", humidity: 45, windSpeed: 3.2 },
    "서울": { temp: 16, condition: "흐림", humidity: 60, windSpeed: 4.5 },
    "부산": { temp: 20, condition: "맑음", humidity: 55, windSpeed: 2.8 },
    "인천": { temp: 15, condition: "비", humidity: 75, windSpeed: 5.2 },
    "광주": { temp: 19, condition: "맑음", humidity: 50, windSpeed: 3.0 },
    "대전": { temp: 17, condition: "흐림", humidity: 58, windSpeed: 3.8 },
    "울산": { temp: 21, condition: "맑음", humidity: 52, windSpeed: 2.5 },
    "세종": { temp: 16, condition: "흐림", humidity: 62, windSpeed: 4.0 }
  });

  const weather = regionWeather[selectedRegion];

  // 카운터 애니메이션
  useEffect(() => {
    const animateCount = (target: number, setter: (val: number) => void) => {
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

    animateCount(1247, setFirefighterCount);
    animateCount(28, setActiveStations);
    animateCount(156, setTotalVehicles);
  }, []);

  const getWeatherIcon = (condition: string) => {
    if (condition.includes("맑음")) return "☀️";
    if (condition.includes("흐림")) return "☁️";
    if (condition.includes("비")) return "🌧️";
    if (condition.includes("눈")) return "❄️";
    return "☀️";
  };

  const getWeatherColor = (condition: string) => {
    if (condition.includes("맑음")) return "from-blue-400 to-blue-500";
    if (condition.includes("흐림")) return "from-gray-400 to-gray-500";
    if (condition.includes("비")) return "from-blue-600 to-blue-700";
    if (condition.includes("눈")) return "from-cyan-400 to-cyan-500";
    return "from-blue-400 to-blue-500";
  };

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
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">전체 인력</span>
                <span className="text-gray-700 font-semibold">1,250명</span>
              </div>
            </div>
          </div>

          {/* 활동 소방서 */}
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 cursor-pointer border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-blue-100 p-3 rounded-xl">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                ● 운영중
              </div>
            </div>
            <div className="mb-3">
              <div className="text-sm text-gray-500 font-medium mb-2">활동 소방서</div>
              <div className="text-5xl font-bold text-gray-900 mb-1">
                {activeStations}
              </div>
              <div className="text-sm text-gray-400 font-medium">개소</div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">전체 소방서</span>
                <span className="text-gray-700 font-semibold">30개소</span>
              </div>
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
                {totalVehicles}
              </div>
              <div className="text-sm text-gray-400 font-medium">대</div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">출동 가능</span>
                <span className="text-gray-700 font-semibold">156대</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== 하단 정보 박스 2개 ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 일기예보 */}
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