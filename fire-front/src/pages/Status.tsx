// src/pages/Status.tsx
import React, { useState } from "react";
import ManageTab from "../components/Status/ManageTab";
import RegisterTab from "../components/Status/RegisterTab";

type Tab = "register" | "manage";

export default function Status() {
  const [tab, setTab] = useState<Tab>("register");

  return (
    <div className="p-6">
      {/* 상단 탭 */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab("register")}
          className={`px-4 py-2 rounded-t-md text-sm font-semibold ${tab === "register"
              ? "bg-white border-x border-t border-gray-200 -mb-px"
              : "text-gray-600 hover:text-gray-900"
            }`}
        >
          신규등록
        </button>
        <button
          onClick={() => setTab("manage")}
          className={`px-4 py-2 rounded-t-md text-sm font-semibold ${tab === "manage"
              ? "bg-white border-x border-t border-gray-200 -mb-px"
              : "text-gray-600 hover:text-gray-900"
            }`}
        >
          등록차량 관리
        </button>
      </div>

      <div className="border border-gray-200 rounded-b-md rounded-tr-md bg-white">
        {tab === "register" ? <RegisterTab /> : <ManageTab />}
      </div>
    </div>
  );
}
