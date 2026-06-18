export type DispatchProgressStep =
    | "dispatch"
    | "situation-end"
    | "return"
    | "complete";

type StepDef = {
    key: "dispatch" | "situation-end" | "return";
    label: string;
    hint: string;
};

const STEPS: StepDef[] = [
    { key: "dispatch", label: "출동", hint: "현장 이동" },
    { key: "situation-end", label: "상황종료", hint: "활동 완료" },
    { key: "return", label: "복귀", hint: "대기 전환" },
];

function stepIndex(step: DispatchProgressStep): number {
    if (step === "complete") return STEPS.length;
    if (step === "return") return 2;
    if (step === "situation-end") return 1;
    return 0;
}

function getStepState(
    stepKey: StepDef["key"],
    currentStep: DispatchProgressStep
): "done" | "current" | "upcoming" {
    const idx = STEPS.findIndex((s) => s.key === stepKey);
    const currentIdx = stepIndex(currentStep);

    if (currentStep === "complete") return "done";
    if (idx < currentIdx) return "done";
    if (idx === currentIdx) return "current";
    return "upcoming";
}

type Props = {
    currentStep: DispatchProgressStep;
    nextAction: string;
    vehicleLabel?: string;
};

export default function DispatchProgressBar({
    currentStep,
    nextAction,
    vehicleLabel,
}: Props) {
    const progressPct =
        currentStep === "complete"
            ? 100
            : currentStep === "return"
              ? 66
              : currentStep === "situation-end"
                ? 50
                : 33;

    return (
        <div className="w-full bg-white border-b border-gray-200 shadow-sm">
            <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            출동 진행 상황
                        </p>
                        {vehicleLabel && (
                            <p className="text-sm font-bold text-gray-800">{vehicleLabel}</p>
                        )}
                    </div>
                    <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-sm font-bold text-gray-700">
                        {progressPct}%
                    </span>
                </div>

                <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-green-500 transition-all duration-500 ease-out"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>

                <ol className="grid grid-cols-3 gap-2">
                    {STEPS.map((step) => {
                        const state = getStepState(step.key, currentStep);
                        const isDone = state === "done";
                        const isCurrent = state === "current";

                        return (
                            <li
                                key={step.key}
                                className={
                                    "rounded-xl border px-2 py-3 text-center transition-colors " +
                                    (isDone
                                        ? "border-green-300 bg-green-50"
                                        : isCurrent
                                          ? "border-amber-400 bg-amber-50 ring-2 ring-amber-300"
                                          : "border-gray-200 bg-gray-50")
                                }
                            >
                                <div
                                    className={
                                        "mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold " +
                                        (isDone
                                            ? "bg-green-500 text-white"
                                            : isCurrent
                                              ? "bg-amber-500 text-white"
                                              : "bg-gray-300 text-gray-600")
                                    }
                                >
                                    {isDone ? "✓" : STEPS.findIndex((s) => s.key === step.key) + 1}
                                </div>
                                <p
                                    className={
                                        "text-sm font-bold " +
                                        (isCurrent ? "text-amber-900" : isDone ? "text-green-800" : "text-gray-500")
                                    }
                                >
                                    {step.label}
                                </p>
                                <p className="mt-0.5 text-[11px] text-gray-500">{step.hint}</p>
                            </li>
                        );
                    })}
                </ol>

                <div
                    className={
                        "mt-4 rounded-xl border px-4 py-3 text-base font-semibold leading-snug " +
                        (currentStep === "complete"
                            ? "border-green-300 bg-green-50 text-green-900"
                            : "border-blue-200 bg-blue-50 text-blue-900")
                    }
                >
                    <span className="mr-1 text-sm font-bold uppercase text-blue-700">
                        다음 할 일
                    </span>
                    <br />
                    {nextAction}
                </div>
            </div>
        </div>
    );
}
