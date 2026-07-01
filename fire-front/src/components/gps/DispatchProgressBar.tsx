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
        <div className="w-full shrink-0 border-b border-gray-200 bg-white shadow-sm">
            <div className="mx-auto w-full max-w-3xl px-3 py-2.5 sm:px-6 sm:py-4">
                <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3 sm:gap-3">
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-xs">
                            출동 진행 상황
                        </p>
                        {vehicleLabel && (
                            <p className="truncate text-sm font-bold text-gray-800 sm:text-base">
                                {vehicleLabel}
                            </p>
                        )}
                    </div>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-700 sm:px-3 sm:py-1 sm:text-sm">
                        {progressPct}%
                    </span>
                </div>

                <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 sm:mb-3 sm:h-3">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-green-500 transition-all duration-500 ease-out"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>

                <ol className="grid grid-cols-3 gap-1 sm:gap-2">
                    {STEPS.map((step) => {
                        const state = getStepState(step.key, currentStep);
                        const isDone = state === "done";
                        const isCurrent = state === "current";

                        return (
                            <li
                                key={step.key}
                                className={
                                    "rounded-lg border px-1 py-1.5 text-center transition-colors sm:rounded-xl sm:px-2 sm:py-3 " +
                                    (isDone
                                        ? "border-green-300 bg-green-50"
                                        : isCurrent
                                          ? "border-amber-400 bg-amber-50 ring-1 ring-amber-300 sm:ring-2"
                                          : "border-gray-200 bg-gray-50")
                                }
                            >
                                <div
                                    className={
                                        "mx-auto mb-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold sm:mb-1 sm:h-8 sm:w-8 sm:text-sm " +
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
                                        "text-[11px] font-bold leading-tight sm:text-sm " +
                                        (isCurrent
                                            ? "text-amber-900"
                                            : isDone
                                              ? "text-green-800"
                                              : "text-gray-500")
                                    }
                                >
                                    {step.label}
                                </p>
                                <p className="mt-0.5 hidden text-[10px] text-gray-500 sm:block sm:text-[11px]">
                                    {step.hint}
                                </p>
                            </li>
                        );
                    })}
                </ol>

                <div
                    className={
                        "mt-2 rounded-lg border px-3 py-2 text-sm font-semibold leading-snug sm:mt-4 sm:rounded-xl sm:px-4 sm:py-3 sm:text-base " +
                        (currentStep === "complete"
                            ? "border-green-300 bg-green-50 text-green-900"
                            : "border-blue-200 bg-blue-50 text-blue-900")
                    }
                >
                    <span className="mb-0.5 block text-[10px] font-bold uppercase text-blue-700 sm:mb-1 sm:text-sm">
                        다음 할 일
                    </span>
                    {nextAction}
                </div>
            </div>
        </div>
    );
}
