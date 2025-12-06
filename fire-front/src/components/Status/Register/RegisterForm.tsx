    // src/components/Status/Register/RegisterForm.tsx

import type { ApiVehicle, FireStation } from "../RegisterTab";

/* ────────────────────────────────
   내부에서 사용하는 공통 Input 컴포넌트 3종
──────────────────────────────── */

// 기본 Input
function Input({
    label,
    value,
    onChange,
    type = "text",
}: {
    label: string;
    value: string;
    type?: "text" | "number";
    onChange: (v: string) => void;
}) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">{label}</span>
            <input
                value={value}
                type={type}
                onChange={(e) => onChange(e.target.value)}
                className="h-9 border rounded px-3"
            />
        </label>
    );
}

// Select
function Select({
    label,
    value,
    onChange,
    options,
    disabled = false,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: string[];
    disabled?: boolean;
}) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">{label}</span>
            <select
                className="h-9 border rounded px-3"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
            >
                <option value="">선택하세요</option>
                {options.map((op) => (
                    <option key={op} value={op}>
                        {op}
                    </option>
                ))}
            </select>
        </label>
    );
}

// 전화번호 마스킹
function InputMasked({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    const handleInput = (raw: string) => {
        let digits = raw.replace(/\D/g, "");
        if (digits.length > 11) digits = digits.slice(0, 11);
        onChange(digits);
    };

    const format = (digits: string) => {
        if (digits.length <= 3) return digits;
        if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    };

    return (
        <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">{label}</span>
            <input
                value={format(value)}
                onChange={(e) => handleInput(e.target.value)}
                className="h-9 border rounded px-3"
            />
        </label>
    );
}

/* ────────────────────────────────
         RegisterForm 본체
──────────────────────────────── */

function RegisterForm({
    form,
    stations,
    onChange,
    loading,
    handleRegister,
    SIDO_OPTIONS,
    toNum,
    rallyPoint,
    setRallyPoint,
}: {
    form: ApiVehicle;
    stations: FireStation[];
    onChange: (key: keyof ApiVehicle, value: string | number | "") => void;
    loading: boolean;
    handleRegister: () => void;
    SIDO_OPTIONS: string[];
    toNum: (v: string | number | undefined) => number | "";
    rallyPoint: string;
    setRallyPoint: (v: string) => void;
}) {
    return (
        <section className="border rounded">
            <header className="px-5 py-3 border-b font-semibold">신규 등록</header>

            <div className="p-5 space-y-4">

                <div className="grid md:grid-cols-3 gap-4">

                    <Select
                        label="시도"
                        value={form.sido}
                        onChange={(v) => onChange("sido", v)}
                        options={SIDO_OPTIONS}
                    />

                    <Select
                        label="소방서"
                        value={form.stationName}
                        onChange={(v) => onChange("stationName", v)}
                        options={stations.map((s) => s.name)}
                        disabled={!form.sido}
                    />

                    <Input
                        label="차종"
                        value={form.typeName}
                        onChange={(v) => onChange("typeName", v)}
                    />

                    <Input
                        label="호출명"
                        value={form.callSign}
                        onChange={(v) => onChange("callSign", v)}
                    />

                    <Input
                        label="용량"
                        value={String(form.capacity)}
                        onChange={(v) => onChange("capacity", toNum(v))}
                    />

                    <Input
                        label="인원"
                        value={String(form.personnel)}
                        onChange={(v) => onChange("personnel", toNum(v))}
                    />

                    <InputMasked
                        label="AVL 단말기"
                        value={form.avlNumber}
                        onChange={(v) => onChange("avlNumber", v)}
                    />

                    <InputMasked
                        label="PS-LTE 번호"
                        value={form.psLteNumber}
                        onChange={(v) => onChange("psLteNumber", v)}
                    />

                    {/* 자원집결지 주소 */}
                    <Input
                        label="자원집결지 주소"
                        value={rallyPoint}
                        onChange={(v) => setRallyPoint(v)}
                    />
                </div>

                <button
                    onClick={handleRegister}
                    className="px-4 h-9 bg-[#e1412b] text-white rounded"
                >
                    {loading ? "등록 중..." : "차량 등록"}
                </button>
            </div>
        </section>
    );
}

export default RegisterForm;
