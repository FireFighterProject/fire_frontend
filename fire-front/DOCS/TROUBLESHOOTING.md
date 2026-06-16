# fire-front 트러블슈팅 가이드

> 최종 업데이트: 2026-03-26  
> 스택: React 19 / Redux Toolkit / Vite 7 / TypeScript 5.9 / Tailwind 4 / Kakao Maps / Tmap

---

## 목차

1. [상태 코드 불일치 (Critical)](#1-상태-코드-불일치-critical)
2. [types/vehicle.ts 중복 Vehicle 인터페이스](#2-typesvehiclets-중복-vehicle-인터페이스)
3. [global.d.ts STATUS_CODE에 집결중 누락](#3-globaldts-status_code에-집결중-누락)
4. [Dispatch.tsx fetchVehicles 무한 루프 가능성](#4-dispatchtsx-fetchvehicles-무한-루프-가능성)
5. [MapPage 지도에 출동 차량이 표시되지 않는 문제](#5-mappage-지도에-출동-차량이-표시되지-않는-문제)
6. [localStorage 캐시로 인한 오래된 데이터 표시](#6-localstorage-캐시로-인한-오래된-데이터-표시)
7. [소방서 이름→ID 매핑 하드코딩 문제](#7-소방서-이름id-매핑-하드코딩-문제)
8. [AssemblyNavigation GPS 위치 권한 거부](#8-assemblynavigation-gps-위치-권한-거부)
9. [집결 완료 후 상태 불일치](#9-집결-완료-후-상태-불일치)
10. [카카오맵 / Tmap API 키 환경 설정](#10-카카오맵--tmap-api-키-환경-설정)
11. [엑셀 일괄 등록 stationId=0 문제](#11-엑셀-일괄-등록-stationid0-문제)
12. [Vite 프록시 미설정으로 인한 API CORS 오류](#12-vite-프록시-미설정으로-인한-api-cors-오류)

---

## 1. 상태 코드 불일치 (Critical)

### 증상
- 출동 후 차량 상태가 화면마다 다르게 표시됨 (`출동중` vs `활동`)
- 필터에서 특정 상태로 필터링하면 결과가 없거나 의도와 다른 차량이 나옴
- 지도에서 출동 중인 차량이 보이지 않음

### 원인

파일마다 상태 코드 → 문자열 매핑이 제각각으로 정의되어 있습니다.

| 파일 | code 1 | code 2 | code 3 |
|---|---|---|---|
| `vehicleSlice.ts` (statusCodeToLabel) | `"활동"` | `"철수"` | `"집결중"` |
| `Dispatch.tsx` (STATUS_LABELS) | `"출동중"` | `"철수"` | `"집결중"` |
| `types/vehicle.ts` (CODE_STATUS) | `"활동"` | `"대기중"` | `"집결중"` |
| `types/global.d.ts` (CODE_STATUS) | `"활동"` | `"대기중"` | `"출동중"` |

`vehicleSlice.ts`가 API에서 status=1을 **"활동"** 으로 Redux에 저장하는데,  
`Dispatch.tsx`는 status=1을 **"출동중"** 으로 매핑하여 화면에 표시합니다.  
즉, 같은 차량이 Redux에는 "활동", Dispatch 화면에는 "출동중"으로 보입니다.

### 해결 방법

프로젝트 전체에서 **단일 기준표**를 만들고 모든 파일이 이를 import해서 사용합니다.

**`src/constants/vehicleStatus.ts` (신규 파일 생성 권장)**

```ts
// 백엔드 API 기준 상태 코드 (백엔드 정의에 맞춰 확인 후 사용)
export const CODE_TO_STATUS = {
  0: "대기",
  1: "활동",   // 출동 포함 → 백엔드와 협의 후 결정
  2: "철수",
  3: "집결중",
} as const;

export type VehicleStatus = typeof CODE_TO_STATUS[keyof typeof CODE_TO_STATUS];

export const STATUS_TO_CODE: Record<VehicleStatus, number> = {
  대기: 0,
  활동: 1,
  철수: 2,
  집결중: 3,
};
```

이후 `vehicleSlice.ts`, `Dispatch.tsx`, `types/global.d.ts`, `types/vehicle.ts` 에서  
각자 정의한 상태 코드 매핑을 이 파일의 상수로 교체합니다.

> **백엔드와 협의 필수**: status=1이 "활동"인지 "출동중"인지 백엔드 API 명세 기준으로 통일해야 합니다.

---

## 2. types/vehicle.ts 중복 Vehicle 인터페이스

### 증상
- TypeScript 컴파일 시 `Duplicate identifier 'Vehicle'` 오류 발생 가능
- IDE에서 어떤 Vehicle 타입을 참조하는지 불명확

### 원인

`src/types/vehicle.ts` 파일 내에 `Vehicle` 인터페이스가 **두 번** 선언되어 있습니다.

```
// 27라인: 첫 번째 Vehicle (stationId, status: VehicleStatus, 등 풀 타입)
export interface Vehicle { ... }

// 212라인: 두 번째 Vehicle (더 단순한 구조)
export interface Vehicle { ... }  // ← 중복!
```

TypeScript에서 동일 파일 내 `export interface` 중복은 컴파일 에러입니다.

### 해결 방법

`vehicle.ts` 하단 210라인 이후의 두 번째 `Vehicle` 인터페이스(212~230라인)를 삭제합니다.  
첫 번째 인터페이스(27~69라인)가 더 완전한 타입이므로 이를 유지합니다.

---

## 3. global.d.ts STATUS_CODE에 집결중 누락

### 증상
- 집결중 상태의 차량을 서버에 전송할 때 `status: undefined` 가 전송됨
- 서버에서 400 Bad Request 또는 status=0(대기)로 처리됨

### 원인

`src/types/global.d.ts`의 `VehicleStatus` 타입에는 `"집결중"`이 포함되어 있으나,  
`STATUS_CODE` 객체에는 `"집결중"` 키가 없습니다.

```ts
// global.d.ts
export const STATUS_CODE: Record<VehicleStatus, number> = {
  "대기": 0,
  "활동": 1,
  "대기중": 2,
  "출동중": 3,
  "복귀": 4,
  "철수": 5,
  // "집결중" 없음! ← 버그
};
```

`toApiVehicleFromFront(v)` 호출 시 v.status가 `"집결중"`이면  
`STATUS_CODE["집결중"]` = `undefined` → `status: undefined`가 API로 전송됩니다.

### 해결 방법

`global.d.ts`의 `STATUS_CODE`에 `"집결중"` 항목을 추가합니다.

```ts
export const STATUS_CODE: Record<VehicleStatus, number> = {
  "대기": 0,
  "활동": 1,
  "대기중": 2,
  "출동중": 3,
  "복귀": 4,
  "철수": 5,
  "집결중": 3, // ← 추가 (백엔드 코드 확인 후 적용)
};
```

> [이슈 1](#1-상태-코드-불일치-critical)과 함께 상태 코드 전체를 통합 상수로 교체하는 방향을 권장합니다.

---

## 4. Dispatch.tsx fetchVehicles 무한 루프 가능성

### 증상
- 페이지 진입 시 `/api/vehicles`, `/api/fire-stations/:id` API가 지속적으로 호출됨
- 브라우저 네트워크 탭에서 동일 요청이 반복되는 것을 확인할 수 있음
- 화면이 깜빡이거나 성능이 저하됨

### 원인

```tsx
// Dispatch.tsx
const fetchVehicles = useCallback(async () => {
  ...
  const stations = await getStations(...);   // stationCache 업데이트
  ...
}, [dispatch, stationCache]);  // ← stationCache가 deps에 포함

useEffect(() => {
  fetchVehicles();
}, [fetchVehicles]);  // ← fetchVehicles가 deps에 포함
```

실행 순서:
1. 컴포넌트 마운트 → `fetchVehicles` 실행
2. `getStations` 내부에서 `setStationCache(next)` 호출
3. `stationCache` 상태 변경 → `fetchVehicles` 함수 재생성 (useCallback deps 변화)
4. `useEffect` deps 변화 → `fetchVehicles` 재실행
5. 2번으로 돌아가 무한 반복

### 해결 방법

`stationCache`를 `useCallback` deps에서 제거하고 `useRef`로 관리합니다.

```tsx
const stationCacheRef = useRef<Record<number, ApiFireStation>>({});

const getStations = async (ids: number[]) => {
  const cache = stationCacheRef.current;
  const need = [...new Set(ids)].filter((id) => !cache[id]);

  if (need.length) {
    const fetched = await Promise.all(
      need.map((id) =>
        api.get<ApiFireStation>(`/fire-stations/${id}`).then((r): [number, ApiFireStation] => [id, r.data])
      )
    );
    fetched.forEach(([id, fs]) => { stationCacheRef.current[id] = fs; });
  }

  return stationCacheRef.current;
};

const fetchVehicles = useCallback(async () => {
  // stationCache를 deps에서 제거
  ...
}, [dispatch]);  // stationCache 제거

useEffect(() => {
  fetchVehicles();
}, []);  // 마운트 시 1회만 실행
```

---

## 5. MapPage 지도에 출동 차량이 표시되지 않는 문제

### 증상
- 출동 발송 후 해당 차량이 지도에서 사라지거나 처음부터 보이지 않음
- `/api/gps/all` 응답에 차량 GPS 데이터가 있음에도 마커가 생성되지 않음

### 원인 1: "활동" 상태만 필터링

```tsx
// MapPage.tsx
const filtered = useMemo(() => {
  return data
    .filter((v) => v.status === "활동")  // ← "출동중" 차량은 제외됨
    ...
}, [data, filters]);
```

`Dispatch.tsx`에서 출동 처리 후 Redux에 "출동중" 상태로 저장된 차량은  
`MapPage`의 `"활동"` 필터에 걸리지 않아 지도에 표시되지 않습니다.

### 원인 2: Redux에 차량이 없으면 GPS 데이터와 병합 불가

`buildMapVehicles()` 함수는 `storeVehicles`(Redux)에 등록된 차량과 GPS 데이터를 조인합니다.  
차량이 Redux에 없으면 GPS 위치가 있어도 마커가 생성되지 않습니다.

### 해결 방법

**원인 1**: 상태 코드를 통일한 후([이슈 1](#1-상태-코드-불일치-critical) 참조), 필터 조건을 수정합니다.

```tsx
// 출동(활동) 차량을 모두 표시하려면:
.filter((v) => v.status === "활동" || v.status === "출동중")
```

**원인 2**: 앱 진입 시 또는 지도 페이지 접근 시 반드시 `fetchVehicles` thunk를 호출해  
Redux에 최신 차량 목록이 로드되도록 합니다.

---

## 6. localStorage 캐시로 인한 오래된 데이터 표시

### 증상
- 앱을 새로 열었을 때 이미 삭제되거나 상태가 변경된 차량이 표시됨
- 화면 새로고침 후에도 오래된 데이터가 남아있음

### 원인

`vehicleSlice.ts`의 초기값이 localStorage에서 로드됩니다.

```ts
const initialState: VehicleState = {
  vehicles: loadFromLS<Vehicle[]>("vehicles", []),  // ← 이전 세션 데이터 로드
  ...
};
```

또한, `fetchVehicles` 실패 시 vehicles를 빈 배열로 초기화합니다.

```ts
.addCase(fetchVehicles.rejected, (state) => {
  state.vehicles = [];  // ← API 실패 시 캐시 삭제
});
```

### 해결 방법

앱 마운트 또는 각 페이지 진입 시 항상 `fetchVehicles`를 호출합니다.  
캐시는 오프라인 폴백용으로만 사용하고, 네트워크 연결 시에는 서버 데이터를 우선시합니다.

```ts
// 실패해도 캐시를 유지하려면:
.addCase(fetchVehicles.rejected, (state, action) => {
  state.loading = false;
  state.error = action.error.message ?? "로드 실패";
  // state.vehicles = [];  ← 이 줄 제거 또는 조건부 처리
});
```

캐시를 완전히 신뢰하지 않으려면 localStorage 저장 시 타임스탬프를 기록하고,  
일정 시간(예: 5분) 초과 시 캐시를 무시하도록 처리합니다.

---

## 7. 소방서 이름→ID 매핑 하드코딩 문제

### 증상
- 엑셀 업로드 후 "포항소방서", "구미소방서" 외 소방서의 차량이 `stationId: 0`으로 등록됨
- 서버에서 stationId=0이 유효하지 않아 등록 실패 또는 잘못된 소방서에 배정됨

### 원인

`types/global.d.ts`와 `types/vehicle.ts` 모두 소방서 이름→ID 매핑을 하드코딩합니다.

```ts
const STATION_NAME_TO_ID: Record<string, number> = {
  "포항소방서": 1,
  "구미소방서": 2,
  // 그 외 소방서 없음
};
```

엑셀의 소방서명이 위 목록에 없으면 `stationId: 0` 으로 전송됩니다.

### 해결 방법

**단기**: 백엔드의 실제 소방서 ID 목록을 받아 `STATION_NAME_TO_ID`를 완성합니다.

**장기**: 엑셀 업로드 전 `GET /fire-stations` API로 전체 소방서 목록을 로드하고  
동적으로 이름→ID 매핑을 구성합니다.

```ts
// RegisterTab.tsx에서 소방서 목록 로드 후:
const stationMap = new Map(stations.map(s => [s.name, s.id]));

// 엑셀 변환 시:
const stationId = stationMap.get(row.소방서) ?? null;
if (!stationId) {
  alert(`알 수 없는 소방서: ${row.소방서}`);
  return;
}
```

---

## 8. AssemblyNavigation GPS 위치 권한 거부

### 증상
- 집결 내비 페이지(`/gps/assembly`) 접속 시 내 위치가 표시되지 않음
- 화면에 아무런 오류 메시지 없이 경로 안내가 시작되지 않음

### 원인

`navigator.geolocation.watchPosition`의 오류 콜백이 처리되지 않거나,  
HTTPS가 아닌 환경(HTTP)에서는 브라우저가 위치 정보 API를 차단합니다.

### 해결 방법

1. **HTTPS 환경에서 서비스**: 위치 정보 API는 `localhost` 또는 HTTPS에서만 동작합니다.  
   배포 시 반드시 HTTPS를 사용하세요.

2. **오류 콜백 처리 확인**:

```ts
navigator.geolocation.watchPosition(
  (pos) => { /* 성공 처리 */ },
  (err) => {
    if (err.code === err.PERMISSION_DENIED) {
      alert("위치 권한이 거부되었습니다. 브라우저 설정에서 위치 접근을 허용해주세요.");
    } else if (err.code === err.POSITION_UNAVAILABLE) {
      alert("현재 위치를 가져올 수 없습니다.");
    } else {
      alert("위치 정보 오류: " + err.message);
    }
  },
  { enableHighAccuracy: true, timeout: 10000 }
);
```

3. **iOS Safari**: 설정 > Safari > 위치 > "허용"으로 변경 후 재시도하세요.

---

## 9. 집결 완료 후 상태 불일치

### 증상
- 집결 완료 처리 후 차량 상태가 관제 화면에서 즉시 반영되지 않음
- 집결 완료된 차량이 여전히 "집결중"으로 표시됨
- `rally` 값과 `status` 값이 서로 맞지 않음

### 원인

`AssemblyNavigation.tsx`에서 집결 완료 시 두 가지 API를 순차 호출합니다:

```ts
// 1) 상태를 0(대기)으로 변경
await axios.patch(`/api/vehicles/${vehicleId}/status`, { status: 0 });

// 2) rallyPoint를 1로 설정
await axios.patch(`/api/vehicles/${vehicleId}/assembly`, { rallyPoint: 1 });
```

그러나 관제(MapPage/StatusPage)는 Redux를 통해 차량 상태를 표시하므로,  
API 호출 이후 Redux를 업데이트하지 않으면 화면에 반영되지 않습니다.

### 해결 방법

집결 완료 후 `fetchVehicles` thunk를 재실행하거나, Redux의 `updateVehicle` action을 dispatch합니다.

```ts
// 집결 완료 처리 후:
await axios.patch(`/api/vehicles/${vehicleId}/status`, { status: 0 });
await axios.patch(`/api/vehicles/${vehicleId}/assembly`, { rallyPoint: 1 });

// Redux 상태 동기화 (필요 시 store import 후 dispatch)
dispatch(updateVehicle({
  id: String(vehicleId),
  patch: { status: "대기", rally: true }
}));
```

---

## 10. 카카오맵 / Tmap API 키 환경 설정

### 증상
- 지도가 표시되지 않거나 빈 화면이 나옴
- 콘솔에 `Kakao maps API key is invalid` 또는 `401 Unauthorized` 오류 발생
- Tmap 경로 안내가 동작하지 않음

### 해결 방법

1. **`.env` 파일 생성** (프로젝트 루트, `.gitignore`에 추가되어야 함):

```env
VITE_KAKAO_MAP_KEY=발급받은_카카오맵_앱키
VITE_TMAP_API_KEY=발급받은_Tmap_앱키
```

2. **카카오 API 키 발급**: [Kakao Developers](https://developers.kakao.com) → 앱 생성 → JavaScript 키 사용

3. **Tmap API 키 발급**: [SKT API Portal](https://openapi.sk.com) → 가입 후 Tmap 앱키 발급

4. **도메인 등록**: 카카오 개발자 콘솔에서 사이트 도메인에 실제 서비스 도메인(또는 `http://localhost:5173`) 추가 필수

5. **환경변수 적용 확인**:

```ts
// useKakaoLoader.ts 또는 카카오 초기화 부분
const key = import.meta.env.VITE_KAKAO_MAP_KEY;
if (!key) console.error("카카오맵 API 키가 설정되지 않았습니다.");
```

---

## 11. 엑셀 일괄 등록 stationId=0 문제

### 증상
- 엑셀 파일로 차량 일괄 등록 시 서버에서 `400 Bad Request` 또는 등록 후 소방서 정보 없음
- 등록된 차량의 소방서 필드가 비어있음

### 원인

[이슈 7](#7-소방서-이름id-매핑-하드코딩-문제)과 동일하게, 엑셀의 소방서 컬럼 값이  
하드코딩된 `STATION_NAME_TO_ID` 맵에 없으면 `stationId: 0`으로 변환됩니다.

또한 `toApiVehicleFromExcel` 함수에서 stationId=0이 되는 경우에 대한 경고 처리가 없습니다.

```ts
// global.d.ts
const stationId = STATION_NAME_TO_ID[row.소방서] ?? 0; // ⚠️ 0은 유효하지 않은 ID
```

### 해결 방법

1. 소방서 목록을 API에서 동적으로 로드합니다. (이슈 7 참조)
2. 엑셀 파싱 시 매핑 실패 행을 사용자에게 알립니다:

```ts
const invalidRows = rows.filter(row => !stationMap.has(row.소방서));
if (invalidRows.length > 0) {
  alert(`다음 소방서를 찾을 수 없습니다:\n${invalidRows.map(r => r.소방서).join(", ")}`);
  return;
}
```

---

## 12. Vite 프록시 미설정으로 인한 API CORS 오류

### 증상
- 개발 서버(`localhost:5173`) 실행 시 API 요청에서 CORS 오류 발생
- 콘솔: `Access to XMLHttpRequest at 'http://백엔드주소/api/...' has been blocked by CORS policy`

### 원인

프론트엔드 axios 인스턴스들이 모두 `baseURL: "/api"`를 사용하는데,  
`vite.config.ts`에 프록시 설정이 없으면 `/api` 요청이 Vite 개발 서버로 향해 404가 납니다.

### 해결 방법

`vite.config.ts`에 프록시 설정을 추가합니다:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      "/api": {
        target: "http://백엔드서버주소:포트",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        // 백엔드 경로에 /api가 이미 포함된 경우 rewrite 제거
      },
    },
  },
});
```

> `.env` 파일에서 백엔드 URL을 관리하는 것을 권장합니다:
> ```env
> VITE_API_BASE=http://백엔드서버주소:포트
> ```

---

## 빠른 체크리스트

개발 환경 세팅 또는 버그 발생 시 아래 항목을 순서대로 확인하세요.

- [ ] `.env` 파일에 `VITE_KAKAO_MAP_KEY`, `VITE_TMAP_API_KEY` 설정 여부
- [ ] `vite.config.ts` 프록시 설정 여부
- [ ] 브라우저 콘솔에 CORS 오류 없음
- [ ] `types/vehicle.ts` 중복 `Vehicle` 인터페이스 삭제 여부
- [ ] `global.d.ts` `STATUS_CODE`에 `집결중` 포함 여부
- [ ] Redux DevTools에서 차량 상태 값이 단일 기준(`"활동"` 또는 `"출동중"` 중 하나)으로 통일되어 있는지
- [ ] 지도 페이지에서 차량 상태 필터 조건이 출동 상태 문자열과 일치하는지
- [ ] 집결 완료 후 Redux 상태가 갱신되는지
- [ ] 소방서 이름→ID 매핑이 실제 운영 데이터와 일치하는지
- [ ] `Dispatch.tsx` fetchVehicles 무한 호출 없음 (네트워크 탭 확인)
