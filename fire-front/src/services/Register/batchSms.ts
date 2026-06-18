import apiClient from "../../api/axios";
import { fetchVehicleList } from "../../api/vehicles";
import { normalizePhone } from "./utils";

export type ExcelRowForSms = {
    callSign: string;
    contact: string;
    stationName: string;
};

export type SmsSendResult = {
    succeeded: string[];
    failed: Array<{ callSign: string; reason: string }>;
};

function digits(value: string) {
    return normalizePhone(value);
}

/** batch 응답 vehicleIds ↔ 엑셀 행을 호출명·연락처로 정확히 매칭 */
export async function matchExcelRowsToVehicleIds(
    excelRows: ExcelRowForSms[],
    vehicleIds: number[]
): Promise<Array<{ vehicleId: number; row: ExcelRowForSms }>> {
    const list = await fetchVehicleList();
    const idSet = new Set(vehicleIds.map(Number));
    const registered = list.filter((v) => idSet.has(v.id));

    const usedIds = new Set<number>();
    const pairs: Array<{ vehicleId: number; row: ExcelRowForSms }> = [];

    for (const row of excelRows) {
        const rowPhone = digits(row.contact);
        const match = registered.find(
            (v) =>
                !usedIds.has(v.id) &&
                v.callSign === row.callSign &&
                digits(v.psLteNumber || v.avlNumber || "") === rowPhone
        );
        if (match) {
            pairs.push({ vehicleId: match.id, row });
            usedIds.add(match.id);
        }
    }

    for (const id of vehicleIds) {
        if (usedIds.has(id)) continue;
        const apiVehicle = registered.find((v) => v.id === id);
        if (!apiVehicle) continue;

        const row = excelRows.find(
            (r) =>
                !pairs.some((p) => p.row === r) &&
                r.callSign === apiVehicle.callSign
        );
        if (row) {
            pairs.push({ vehicleId: id, row });
            usedIds.add(id);
        }
    }

    return pairs;
}

export async function sendBulkSms(
    pairs: Array<{ vehicleId: number; row: ExcelRowForSms }>,
    buildText: (vehicleId: number, row: ExcelRowForSms) => string
): Promise<SmsSendResult> {
    const results = await Promise.allSettled(
        pairs.map(({ vehicleId, row }) =>
            apiClient
                .post("/sms/to-vehicle", { vehicleId, text: buildText(vehicleId, row) })
                .then(() => row.callSign)
        )
    );

    const succeeded: string[] = [];
    const failed: Array<{ callSign: string; reason: string }> = [];

    results.forEach((result, i) => {
        const callSign = pairs[i].row.callSign;
        if (result.status === "fulfilled") {
            succeeded.push(result.value);
            return;
        }

        const err = result.reason as {
            response?: { data?: { message?: string } };
            message?: string;
        };
        failed.push({
            callSign,
            reason: err?.response?.data?.message ?? err?.message ?? "발송 실패",
        });
    });

    return { succeeded, failed };
}

export function formatSmsResultMessage(
    inserted: number,
    result: SmsSendResult
): string {
    if (result.failed.length === 0) {
        return `등록 ${inserted}건 + 문자 ${result.succeeded.length}건 발송 완료`;
    }

    return (
        `등록 ${inserted}건 완료\n\n` +
        `문자 발송 결과\n` +
        `성공: ${result.succeeded.length}건\n` +
        `실패: ${result.failed.length}건\n\n` +
        `실패 차량:\n${result.failed.map((f) => `- ${f.callSign}: ${f.reason}`).join("\n")}\n\n` +
        `실패 차량은 수동으로 재발송해 주세요.`
    );
}
