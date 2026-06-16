# 트러블슈팅 사례 (포트폴리오)

> 프로젝트: **소방 자원관제 시스템 (fire-front)**  
> 스택: React 19 · Redux Toolkit · TypeScript · Vite · Kakao Maps · Tmap  
> 도메인: 소방차량 출동·집결 관제 (실시간 GPS 추적 포함)

---

## 사례 1. GPS 추적이 이동 중 지속적으로 끊기는 문제

### 배경

소방차가 자원집결지로 이동하는 동안 운전자 스마트폰에서  
집결지까지의 경로를 안내하고 관제센터로 실시간 위치를 5초마다 전송하는 기능입니다.  
실제 테스트에서 이동 중 GPS 좌표가 간헐적으로 끊기는 현상이 발생했습니다.

### 문제 발견

`AssemblyNavigation.tsx`의 위치 추적 `useEffect`를 분석했습니다.

```tsx
// AssemblyNavigation.tsx (349~437라인)
useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
        (pos) => {
            ...
            const speed = (distM / dtSec) * 3.6;
            setCurrentSpeedKph(speed); // ← state 업데이트 발생
            ...
        },
        (err) => { ... },
        { enableHighAccuracy: true }
    );

    return () => {
        navigator.geolocation.clearWatch(watchId); // ← 클린업: 추적 해제
    };
}, [map, destLat, destLon, currentSpeedKph]); // ← currentSpeedKph가 deps에 포함!
```

### 근본 원인 (Root Cause)

`watchPosition` 콜백 내부에서 `setCurrentSpeedKph(speed)`를 호출하면  
`currentSpeedKph` 상태값이 변경됩니다.  
React는 이를 deps 변화로 감지하여 **useEffect를 재실행**합니다.  
재실행 시 클린업 함수가 먼저 실행되어 `clearWatch`로 GPS 추적을 해제합니다.  
그 직후 새로운 `watchPosition`을 등록합니다.

결과적으로 **차량이 이동할 때마다** (= 속도가 계산될 때마다) GPS 추적이 해제→재등록을 반복합니다.

```
GPS 콜백 실행
    → setCurrentSpeedKph(speed) 호출
        → currentSpeedKph 상태 변경
            → useEffect deps 변화 감지
                → 클린업: clearWatch(watchId) ← GPS 추적 해제!
                → 새 watchPosition 등록
                    → GPS 콜백 실행 → 반복
```

이 루프는 차량이 정차(속도=0)일 때는 발생하지 않다가,  
**출발 직후 속도가 갱신되는 순간부터** 매 위치 업데이트마다 GPS 추적이 끊깁니다.

### 해결 방법

`currentSpeedKph`를 `useRef`로 관리하여 deps에서 제거합니다.  
속도는 화면 표시용 state와 계산용 ref를 분리하여 관리합니다.

```tsx
// 수정 전
const [currentSpeedKph, setCurrentSpeedKph] = useState<number | null>(null);

// 수정 후: ref로 최신값 유지 (deps 오염 방지)
const speedRef = useRef<number | null>(null);
const [displaySpeedKph, setDisplaySpeedKph] = useState<number | null>(null);

useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
        (pos) => {
            ...
            const speed = (distM / dtSec) * 3.6;
            speedRef.current = speed;          // ref 업데이트 (deps 비오염)
            setDisplaySpeedKph(speed);         // UI 표시용만 state로
            ...
        },
        ...
    );
    return () => navigator.geolocation.clearWatch(watchId);
}, [map, destLat, destLon]); // currentSpeedKph 제거
```

### 효과

수정 후 `watchPosition`은 지도(`map`)와 목적지 좌표(`destLat/destLon`)가 변경될 때만  
재등록되므로, 이동 중 GPS 추적이 끊기지 않고 지속됩니다.  
관제센터 화면에서도 소방차 위치가 연속적으로 업데이트되는 것을 확인했습니다.

---

## 사례 2. 출동 페이지 진입 시 API 무한 호출로 서버 부하 폭증

### 배경

출동(Dispatch) 페이지에서 차량 목록과 소방서 정보를 로드하는 기능입니다.  
개발 서버 로그에서 `/api/vehicles`와 `/api/fire-stations/:id` 요청이  
페이지를 열어두는 동안 수백 건씩 계속 쌓이는 현상을 발견했습니다.

### 문제 발견

`Dispatch.tsx`의 데이터 페칭 로직을 분석했습니다.

```tsx
// Dispatch.tsx (100~151라인)

// 소방서 캐시를 state로 관리
const [stationCache, setStationCache] =
    useState<Record<number, ApiFireStation>>({});

// useCallback deps에 stationCache 포함
const fetchVehicles = useCallback(async () => {
    const res = await api.get<ApiVehicleListItem[]>("/vehicles");

    const stations = await getStations(res.data.map((v) => v.stationId));
    // ↑ getStations 내부에서 setStationCache(next) 호출
    ...
}, [dispatch, stationCache]); // ← stationCache가 deps!

useEffect(() => {
    fetchVehicles();
}, [fetchVehicles]); // ← fetchVehicles 재생성 시 재실행
```

### 근본 원인 (Root Cause)

```
① 마운트 → fetchVehicles 실행
② getStations → setStationCache(next) 호출
③ stationCache state 변경
④ useCallback deps 변화 → fetchVehicles 함수 객체 재생성
⑤ useEffect deps 변화 → fetchVehicles 재실행
⑥ ② 로 돌아가 무한 반복
```

페이지가 열려있는 동안 서버에 초당 수십 건의 API 요청이 발생하며,  
소방서 수가 많을수록 병렬 `/fire-stations/:id` 요청도 함께 폭증합니다.

### 해결 방법

소방서 캐시를 `useState`에서 `useRef`로 변경하여 렌더링 사이클에서 분리합니다.

```tsx
// 수정 전: 캐시가 state → 업데이트마다 리렌더링 + deps 오염
const [stationCache, setStationCache] = useState<Record<number, ApiFireStation>>({});

// 수정 후: 캐시를 ref로 관리 → 업데이트해도 deps 변화 없음
const stationCacheRef = useRef<Record<number, ApiFireStation>>({});

const getStations = async (ids: number[]) => {
    const cache = stationCacheRef.current;
    const need = [...new Set(ids)].filter((id) => !cache[id]);
    if (need.length) {
        const results = await Promise.all(
            need.map((id) =>
                api.get<ApiFireStation>(`/fire-stations/${id}`)
                   .then((r): [number, ApiFireStation] => [id, r.data])
            )
        );
        // ref 직접 변경 → 렌더링 트리거 없음
        results.forEach(([id, fs]) => { stationCacheRef.current[id] = fs; });
    }
    return stationCacheRef.current;
};

// useCallback deps에서 캐시 제거
const fetchVehicles = useCallback(async () => {
    ...
}, [dispatch]); // stationCache 제거

// 마운트 시 1회만 실행
useEffect(() => {
    fetchVehicles();
}, []); // fetchVehicles 제거
```

### 효과

수정 전에는 페이지 접속 후 30초 동안 약 200건 이상의 API 요청이 발생했습니다.  
수정 후에는 마운트 시 1회만 요청이 발생하며, 수동 새로고침 버튼으로만 재요청됩니다.

---

## 사례 3. 출동 발송 후 지도에서 해당 차량이 사라지는 문제

### 배경

관제 지도 화면(`MapPage`)에서 출동 중인 소방차 위치를 실시간으로 보여주는 기능입니다.  
출동 발송 처리 후 지도에서 해당 차량 마커가 사라지는 현상이 발생했습니다.  
현장 대응 중 출동 차량의 위치 파악이 불가능해지는 치명적인 상황입니다.

### 문제 발견

출동 후 차량 상태가 어떻게 흐르는지 두 파일을 비교 분석했습니다.

**`Dispatch.tsx`**: 출동 발송 후 status=1을 `"출동중"`으로 매핑하여 Redux에 저장

```tsx
// Dispatch.tsx (44~49라인)
const STATUS_LABELS: Record<number, Vehicle["status"]> = {
    0: "대기",
    1: "출동중", // ← code 1 = "출동중"
    2: "철수",
    3: "집결중",
};
```

**`vehicleSlice.ts`**: API에서 조회 시 status=1을 `"활동"`으로 매핑

```tsx
// vehicleSlice.ts (44~49라인)
const statusCodeToLabel = (code: number): VehicleStatus => {
    if (code === 1) return "활동"; // ← code 1 = "활동"
    if (code === 2) return "철수";
    if (code === 3) return "집결중";
    return "대기";
};
```

**`MapPage.tsx`**: `"활동"` 상태 차량만 지도에 표시

```tsx
// MapPage.tsx (216~226라인)
const filtered = useMemo(() => {
    return data
        .filter((v) => v.status === "활동") // ← "출동중"은 걸러냄!
        .filter(...)
}, [data, filters]);
```

### 근본 원인 (Root Cause)

```
출동 발송
    → Dispatch.tsx: status=1 → "출동중"으로 Redux 저장
    → MapPage.tsx: v.status === "활동" 필터
        → "출동중" ≠ "활동" → 필터 탈락 → 마커 숨김
```

즉 `Dispatch.tsx`와 `vehicleSlice.ts`가 **같은 API 코드(1)를 다른 문자열로 매핑**하고 있어,  
출동 발송 직후 Redux에 `"출동중"`으로 저장된 차량은 지도의 `"활동"` 필터를 통과하지 못합니다.

프로젝트 전체에서 상태 코드 → 문자열 매핑이 파일마다 다르게 정의되어 있었습니다.

| 파일 | code 1 | code 2 | code 3 |
|---|---|---|---|
| `vehicleSlice.ts` | `"활동"` | `"철수"` | `"집결중"` |
| `Dispatch.tsx` | `"출동중"` | `"철수"` | `"집결중"` |
| `types/vehicle.ts` (CODE_STATUS) | `"활동"` | `"대기중"` | `"집결중"` |
| `types/global.d.ts` (CODE_STATUS) | `"활동"` | `"대기중"` | `"출동중"` |

### 해결 방법

상태 코드 매핑을 **단일 상수 파일**로 통합하여 모든 파일이 이를 import해서 사용합니다.

```ts
// src/constants/vehicleStatus.ts (신규)
export const CODE_TO_STATUS = {
    0: "대기",
    1: "활동",   // 출동(dispatch) 포함 — 백엔드 명세 기준 통일
    2: "철수",
    3: "집결중",
} as const;

export type VehicleStatus = typeof CODE_TO_STATUS[keyof typeof CODE_TO_STATUS];

export const STATUS_TO_CODE: Record<VehicleStatus, number> = {
    대기: 0, 활동: 1, 철수: 2, 집결중: 3,
};
```

이후 `Dispatch.tsx`의 `STATUS_LABELS`, `vehicleSlice.ts`의 `statusCodeToLabel`,  
`types/global.d.ts`·`types/vehicle.ts`의 `CODE_STATUS`를 모두 이 파일로 교체합니다.

`MapPage.tsx` 필터도 통합 상수 기준으로 수정합니다.

```tsx
// MapPage.tsx 수정
.filter((v) => v.status === "활동" || v.status === "집결중")
// 출동 중(활동)과 집결 이동 중(집결중) 차량 모두 지도에 표시
```

### 효과

코드 통합 후 출동 발송, 집결 이동, 관제 지도의 상태 표시가 일관되게 동작합니다.  
출동 발송 후 해당 차량의 GPS 위치가 지도에 계속 표시되는 것을 확인했습니다.

---

## 사례 4. 일괄 SMS 발송 중 중간 실패 시 어떤 차량에 문자가 갔는지 알 수 없는 문제

### 배경

엑셀로 여러 차량을 한 번에 등록하면서 각 차량의 운전자에게  
집결지 URL이 포함된 SMS를 순차적으로 발송하는 기능입니다.  
발송 중 네트워크 오류가 발생하면 일부 차량에는 문자가 발송되고  
나머지에는 발송되지 않는 상황에서, 어느 차량이 누락되었는지 알 수 없었습니다.

### 문제 발견

`RegisterTab.tsx`의 일괄 발송 로직을 분석했습니다.

```tsx
// RegisterTab.tsx (258~274라인)
for (let i = 0; i < count; i++) {
    const vehicleId = vehicleIds[i];
    const link = getAssemblyLink(vehicleId);
    const text = `[자원집결지] 차량:${row.callSign} ... 응소OK:${link}`;

    // 순차적 await — 하나라도 throw하면 전체 catch로 이동
    await apiClient.post("/sms/to-vehicle", { vehicleId, text });
}

alert(`등록 ${inserted}건 + 문자 발송 완료`);
// ↑ 여기까지 오면 성공으로 표시되지만,
//   실제로 몇 건이 성공했는지 알 수 없음
```

```tsx
// catch 블록
} catch (err: any) {
    alert(err?.response?.data?.message ?? "일괄 등록 실패");
    // ↑ "일괄 등록 실패" 한 줄로 끝 — 어디서 실패했는지 전혀 알 수 없음
}
```

### 근본 원인 (Root Cause)

- `await`를 `for` 루프 안에서 순차 실행하므로 중간에 예외가 발생하면  
  이후 차량에 대한 SMS는 발송되지 않고 catch 블록으로 이동합니다.
- catch 블록은 "일괄 등록 실패"라는 메시지만 출력하므로  
  **어느 차량(index)에서 실패했는지, 그 전에 몇 건이 성공했는지** 알 수 없습니다.
- 관제 요원은 전체 재발송을 시도해야 하는지, 일부만 재발송해야 하는지  
  판단할 수 없어 **중복 발송 또는 미발송** 상태가 됩니다.

### 해결 방법

`Promise.allSettled`로 전체 발송을 병렬 처리하고,  
결과를 성공/실패 목록으로 분리하여 사용자에게 명확히 알립니다.

```tsx
// 수정 후
const smsResults = await Promise.allSettled(
    vehicleIds.slice(0, count).map((vehicleId, i) => {
        const row = excelRows[i];
        const link = getAssemblyLink(vehicleId);
        const text = `[자원집결지] 차량:${row.callSign} ... 응소OK:${link}`;
        return apiClient
            .post("/sms/to-vehicle", { vehicleId, text })
            .then(() => ({ vehicleId, callSign: row.callSign, ok: true }));
    })
);

const succeeded = smsResults.filter((r) => r.status === "fulfilled");
const failed = smsResults
    .filter((r) => r.status === "rejected")
    .map((_, i) => excelRows[i].callSign);

if (failed.length > 0) {
    alert(
        `문자 발송 결과\n` +
        `✅ 성공: ${succeeded.length}건\n` +
        `❌ 실패: ${failed.length}건\n\n` +
        `실패 차량:\n${failed.join(", ")}\n\n` +
        `해당 차량은 수동으로 재발송해 주세요.`
    );
} else {
    alert(`${succeeded.length}건 전체 발송 완료`);
}
```

또한 발송 속도도 순차 `await` 대비 **최대 count배** 향상됩니다.  
(50대 차량 기준 순차 약 25초 → 병렬 약 1~2초)

### 효과

발송 실패 시 어떤 차량이 누락되었는지 화면에서 바로 확인할 수 있으며,  
성공한 차량에 대한 중복 재발송 없이 실패 차량만 선별하여 재처리할 수 있게 되었습니다.

---

## 정리

| # | 문제 | 영향 | 핵심 원인 |
|---|---|---|---|
| 1 | GPS 추적이 이동 중 지속 재등록 | 실시간 위치 추적 불안정 | `useEffect` deps에 `currentSpeedKph` 포함 → 콜백 내 setState가 deps 변화 유발 |
| 2 | 출동 페이지 API 무한 호출 | 백엔드 서버 부하 폭증 | `stationCache` state가 `useCallback` deps에 포함 → 캐시 업데이트마다 함수 재생성 |
| 3 | 출동 차량이 지도에서 사라짐 | 현장 차량 위치 파악 불가 | 파일마다 상태 코드 매핑이 다름 → `"출동중"` vs `"활동"` 불일치 |
| 4 | 일괄 SMS 부분 실패 시 누락 차량 불명 | 미수신 차량 파악 불가 | `for await` 순차 발송 + 단순 catch → 실패 지점 정보 소실 |
