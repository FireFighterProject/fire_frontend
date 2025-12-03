// src/components/Toggle.tsx
import  { useState, memo, useCallback } from "react";

type ToggleProps = {
  defaultOn?: boolean;                // 초기 상태
  checked?: boolean;                  // 제어형(선택)
  onChange?: (next: boolean) => void; // 상태 변경 콜백
  label?: string;                     // 라벨(선택)
  disabled?: boolean;
  className?: string;                 // 외부 컨테이너 추가 클래스
};

function Toggle({
  defaultOn = false,
  checked,
  onChange,
  label,
  disabled = false,
  className = "",
}: ToggleProps) {
  const isControlled = typeof checked === "boolean";
  const [internal, setInternal] = useState(defaultOn);
  const isOn = isControlled ? (checked as boolean) : internal;

  const handleToggle = useCallback(() => {
    if (disabled) return;
    const next = !isOn;
    if (!isControlled) setInternal(next);
    onChange?.(next);
  }, [disabled, isControlled, isOn, onChange]);

    return (
        <div className="flex items-center gap-2 bg-gray-1 w-40px p-2 ">
    <button 
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-label={label}
      disabled={disabled}
      onClick={handleToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleToggle();
        }
      }}
      className={`inline-flex items-center gap-[5px] select-none cursor-pointer disabled:cursor-not-allowed ${className}`}
    >
      {label && <span className="text-[13px] text-black">{label}</span>}

      {/* 트랙 (40x20, 둥근, 배경 전환) */}
      <span
        className={[
          "relative rounded-full transition-colors duration-300 ease-in-out",
          "w-[40px] h-[20px]",
          isOn ? "bg-[#4caf50]" : "bg-white",
          "ring-1 ring-black/10", // 원래 CSS의 얇은 경계 느낌
          disabled ? "opacity-50" : "",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        ].join(" ")}
      >
        {/* 노브 (16x16, 좌측 시작, 20px 이동) */}
        <span
          className={[
            "absolute top-[2px] left-[2px] rounded-full shadow",
            "w-4 h-4 transition-transform duration-300 ease-in-out",
            isOn ? "translate-x-[20px] bg-white" : "translate-x-0 bg-[#d9d9d9]",
          ].join(" ")}
        />
      </span>
            </button>
        </div>
  );
}

export default memo(Toggle);
