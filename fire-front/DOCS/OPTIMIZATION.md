# 성능 최적화 및 아키텍처 개선 가이드

> 최종 업데이트: 2026-06-16  
> 대상: fire-front (React 19 / Vite 7 / Redux Toolkit)

이 문서는 fire-front 프로젝트에 적용한 **성능·구조 개선 내역**과, 앞으로 개선할 때 참고할 **방향·방법**을 정리합니다.

---

## 목차

1. [개선 배경](#1-개선-배경)
2. [적용한 개선 요약](#2-적용한-개선-요약)
3. [API 레이어 통합](#3-api-레이어-통합)
4. [라우트 코드 스플리팅](#4-라우트-코드-스플리팅)
5. [번들 분리 (manualChunks)](#5-번들-분리-manualchunks)
6. [Redux · localStorage 정리](#6-redux--localstorage-정리)
7. [GPS watchPosition 버그 수정](#7-gps-watchposition-버그-수정)
8. [컴포넌트 분리 · memo](#8-컴포넌트-분리--memo)
9. [빌드 결과 (청크 크기)](#9-빌드-결과-청크-크기)
10. [향후 개선 방향](#10-향후-개선-방향)
11. [관련 파일 맵](#11-관련-파일-맵)

---

## 1. 개선 배경

초기 코드베이스에서 다음 문제가 확인되었습니다.

| 영역 | 문제 |
|------|------|
| API | `axios.create`가 5곳에서 중복 정의, `mapApiToVehicle`·상태 라벨 복붙 |
| 번들 | 모든 페이지 정적 import → GPS·통계·xlsx가 초기 로드에 포함 |
| Redux | `vehicleSlice` reducer + `store.subscribe` 양쪽에서 localStorage 저장 |
| GPS | `watchPosition` effect deps에 `currentSpeedKph` 포함 → watch 재등록 루프 |
| 컴포넌트 | 600줄+ God Component, 리스트 행 memo 미적용 |

소규모 관제 앱으로는 동작하지만, 기능 확장 시 유지보수·로딩 성능 부담이 커지는 구조였습니다.

---

## 2. 적용한 개선 요약

| 항목 | Before | After |
|------|--------|-------|
| API 클라이언트 | 페이지마다 `axios.create` | `src/api/axios.ts` 단일 인스턴스 + 도메인 모듈 |
| 차량 매핑 | Dispatch·Activity·Statistics 등 각자 정의 | `src/services/mappers/vehicleMapper.ts` 단일화 |
| 라우트 로딩 | 15개 페이지 정적 import | `React.lazy` + `Suspense` |
| vendor 분리 | 없음 | `manualChunks` (react, redux, recharts, xlsx) |
| localStorage | reducer + subscribe 이중 저장 | `store.subscribe`만 사용 |
| typed hooks | `useSelector`/`useDispatch` 혼용 | `useAppSelector`/`useAppDispatch` 통일 |
| GPS 추적 | 속도 state가 effect deps | `useRef`로 속도 참조, deps에서 제외 |
| Report UI | 같은 파일 626줄 | `components/Report/ReportParts.tsx` 분리 |

---

## 3. API 레이어 통합

### 방향

HTTP 호출을 **페이지 컴포넌트 밖**으로 빼고, 도메인 단위 모듈로 모읍니다.  
엔드포인트 변경 시 수정 지점을 한곳으로 줄이는 것이 목표입니다.

### 구조

```
src/api/
  axios.ts           # 공통 클라이언트 (인터셉터, Bearer 토큰)
  types.ts           # ApiVehicleListItem, ApiFireStation 등
  vehicles.ts        # /vehicles CRUD
  stations.ts        # /fire-stations
  logs.ts            # /logs → StatLog 변환
  stats.ts           # /stats
  gps.ts             # /gps/all, /gps/send
  dispatchOrders.ts  # 출동 주문 API

src/services/mappers/
  vehicleMapper.ts   # mapApiToVehicle, statusCodeToLabel
```

### 상태 코드 통일

백엔드 숫자 코드를 프런트 라벨로 변환할 때 단일 매핑을 사용합니다.

| 코드 | 라벨 |
|------|------|
| 0 | 대기 |
| 1 | 활동 |
| 2 | 철수 |
| 3 | 집결중 |

> `출동중`은 `활동`(코드 1)과 동일 취급합니다. 기존 화면별 `"출동중"` / `"활동"` 혼용을 점진적으로 통일합니다.

### 사용 예시

```ts
import { fetchVehicleList } from "@/api/vehicles";
import { fetchFireStations } from "@/api/stations";
import { mapApiListToVehicles } from "@/services/mappers/vehicleMapper";

const [vehicles, stations] = await Promise.all([
  fetchVehicleList(),
  fetchFireStations(),
]);
const stationMap = new Map(stations.map((s) => [s.id, s]));
const mapped = mapApiListToVehicles(vehicles, stationMap);
```

### 적용된 페이지

- `Dispatch.tsx`, `Activity.tsx`, `Statistics.tsx`, `Report.tsx`
- `features/vehicle/vehicleSlice.ts`
- `components/Status/ManageTab.tsx`

---

## 4. 라우트 코드 스플리팅

### 방향

**접속 빈도·용량이 큰 페이지**는 초기 번들에서 분리하고, 해당 라우트 진입 시에만 로드합니다.

### 구현 (`src/Route.tsx`)

```tsx
import { lazy, Suspense } from "react";

const Statistics = lazy(() => import("./pages/Statistics"));
const Report = lazy(() => import("./pages/Report"));
const NavigationPage = lazy(() => import("./pages/gps/NavigationPage"));
// ...

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>{/* ... */}</Routes>
    </Suspense>
  );
}
```

### 분리 대상 (우선순위)

| 우선순위 | 페이지 | 이유 |
|----------|--------|------|
| 높음 | `/statistics` | Recharts 의존 |
| 높음 | `/status` (엑셀) | xlsx 의존 |
| 높음 | `/gps/*`, `/map/navigation` | 대형 GPS·지도 로직 |
| 중간 | `/report`, `/dispatch`, `/activity` | 상대적으로 독립적 |
| 낮음 | `/`, `/manage` | 자주 쓰는 관리 화면 |

### 효과

- 초기 `index` 청크: **~232KB** (gzip ~77KB)
- Statistics·Report·GPS 페이지는 **별도 청크**로 분리되어 첫 화면 로딩 경량화

---

## 5. 번들 분리 (manualChunks)

### 방향

자주 바뀌지 않는 대형 라이브러리를 **vendor 청크**로 묶어 브라우저 캐시 효율을 높입니다.

### 설정 (`vite.config.ts`)

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ["react", "react-dom", "react-router-dom"],
        redux: ["@reduxjs/toolkit", "react-redux"],
        charts: ["recharts"],
        xlsx: ["xlsx"],
      },
    },
  },
},
```

### 청크별 역할

| 청크 | 포함 | 로드 시점 |
|------|------|-----------|
| `vendor` | React, Router | 앱 시작 |
| `redux` | Redux Toolkit | 앱 시작 |
| `charts` | Recharts | `/statistics` 진입 시 |
| `xlsx` | xlsx | 엑셀 업로드 사용 시 |

---

## 6. Redux · localStorage 정리

### 문제

`vehicleSlice`의 각 reducer와 `store.ts`의 `subscribe`가 **둘 다** `localStorage.setItem("vehicles", ...)`를 호출해, 차량 상태 변경마다 이중 저장이 발생했습니다.

### 개선

- **reducer**: 순수하게 state만 변경 (`lastSavedAt` 갱신)
- **store.subscribe**: vehicles 변경 감지 후 localStorage 저장 + `markSaved` dispatch

```ts
// store.ts
store.subscribe(() => {
  const cur = JSON.stringify(store.getState().vehicle.vehicles);
  if (cur !== prev) {
    prev = cur;
    localStorage.setItem("vehicles", cur);
    store.dispatch(markSaved());
  }
});
```

### typed hooks 통일

```ts
// hooks.ts
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

페이지·컴포넌트에서 `useAppSelector` / `useAppDispatch`를 사용해 타입 안전성과 일관성을 확보합니다.

---

## 7. GPS watchPosition 버그 수정

### 문제

`AssemblyNavigation.tsx`에서 ETA 계산을 위해 `currentSpeedKph`를 `useEffect` deps에 넣었습니다.  
속도가 갱신될 때마다 effect가 재실행되어 `clearWatch` → `watchPosition` 재등록 루프가 발생했습니다.

자세한 분석은 [TROUBLESHOOTING_GPS.md](./TROUBLESHOOTING_GPS.md)를 참고하세요.

### 개선 방법

속도는 **화면 표시용 state**와 **effect 내부 참조용 ref**를 분리합니다.

```tsx
const [currentSpeedKph, setCurrentSpeedKph] = useState<number | null>(null);
const speedKphRef = useRef<number | null>(null);

useEffect(() => {
  const watchId = navigator.geolocation.watchPosition((pos) => {
    // 속도 계산 후
    setCurrentSpeedKph(speed);      // UI용
    speedKphRef.current = speed;    // ETA 계산용 (deps 영향 없음)

    const speedKph =
      speedKphRef.current && speedKphRef.current > 5
        ? speedKphRef.current
        : 40;
    // ETA 계산...
  });
  return () => navigator.geolocation.clearWatch(watchId);
}, [map, destLat, destLon]); // currentSpeedKph 제외
```

### 원칙

> `watchPosition` / `setInterval` / WebSocket 구독 effect의 deps에는 **구독 콜백 안에서 갱신되는 state**를 넣지 않습니다.  
> 최신 값이 필요하면 `useRef`를 사용합니다.

---

## 8. 컴포넌트 분리 · memo

### Report 페이지 분리

`Report.tsx` 하단에 있던 `PreviewSection`, `SimpleTable`, `KPICard` 등을  
`src/components/Report/ReportParts.tsx`로 이동하고 `React.memo`를 적용했습니다.

### 리스트 행 memo

| 컴포넌트 | 파일 | 효과 |
|----------|------|------|
| `ActivityRow` | `components/Activity/table/ActivityRow.tsx` | 활동 차량 테이블 리렌더 감소 |
| `VehicleTable` | `components/Status/manage/VehicleTable.tsx` | 등록 차량 목록 리렌더 감소 |
| `Toggle` | `components/emergencyToggle/Togglebut.tsx` | 기존 적용 유지 |

### memo 적용 기준

- 부모가 자주 리렌더되고, props가 자주 바뀌지 않는 **리스트 행·카드**
- 무거운 자식 트리를 가진 **표시 전용** 컴포넌트

memo를 남용하면 오히려 비교 비용이 늘 수 있으므로, React DevTools Profiler로 확인 후 선별 적용합니다.

---

## 9. 빌드 결과 (청크 크기)

`npm run build` 기준 (2026-06-16):

| 청크 | 크기 | gzip | 비고 |
|------|------|------|------|
| `index` | 232 KB | 77 KB | 초기 로드 |
| `vendor` | 45 KB | 16 KB | React·Router |
| `redux` | 32 KB | 12 KB | Redux Toolkit |
| `charts` | 304 KB | 89 KB | Statistics 진입 시 |
| `xlsx` | 429 KB | 143 KB | 엑셀 기능 사용 시 |
| `MapPage` | 1,756 KB | 636 KB | 지도·폴리곤 데이터 포함 |
| `Statistics` | 13 KB | 4 KB | 페이지 청크 |
| `Report` | 9 KB | 3 KB | 페이지 청크 |
| `AssemblyNavigation` | 9 KB | 4 KB | GPS 페이지 청크 |

> `MapPage` 청크가 가장 큽니다. `sido.json` / `sig.json` 등 정적 지도 데이터 lazy load가 다음 개선 포인트입니다.

---

## 10. 향후 개선 방향

### 우선순위 높음

| 항목 | 방법 | 기대 효과 |
|------|------|-----------|
| MapPage 청크 축소 | `sido.json`·`sig.json` dynamic import | 초기·지도 페이지 로딩 1MB+ 감소 |
| God Component 분리 | `NavigationPage`(838줄), `AssemblyNavigation` hooks 추출 | 유지보수·테스트 용이 |
| 서버 상태 캐싱 | React Query / SWR 도입 | `/fire-stations` 중복 호출 제거 |

### 우선순위 중간

| 항목 | 방법 |
|------|------|
| API 모듈 확장 | `api/weather.ts` 등 나머지 fetch 호출 통합 |
| `MapFilterPanel` 등 | `fetchFireStations` 공유 캐시 (React Query) |
| Route.tsx 주석 | JSX 내 `//` 주석 → `{/* */}` (DOM 텍스트 노출 방지) — **적용 완료** |

### 우선순위 낮음 (규모 확장 시)

| 항목 | 방법 |
|------|------|
| 가상 스크롤 | 차량 수백 대 이상 시 `react-window` |
| Service Worker | 정적 자산 오프라인 캐시 |
| Web Worker | 대용량 엑셀 파싱 메인 스레드 분리 |

### React Query 도입 시 권장 패턴

```ts
// 예시: 소방서 목록 — 여러 페이지에서 공유
const { data: stations } = useQuery({
  queryKey: ["fire-stations"],
  queryFn: fetchFireStations,
  staleTime: 5 * 60 * 1000, // 5분
});
```

`Report`, `ManageTab`, `MapFilterPanel`, `Activity`가 각각 `/fire-stations`를 호출하는 구조를 하나의 캐시로 통합할 수 있습니다.

---

## 11. 관련 파일 맵

### 최적화 직접 관련

| 파일 | 역할 |
|------|------|
| `src/Route.tsx` | lazy route, Suspense |
| `vite.config.ts` | manualChunks |
| `src/api/*` | API 통합 |
| `src/services/mappers/vehicleMapper.ts` | 차량·상태 매핑 |
| `src/features/vehicle/vehicleSlice.ts` | Redux 차량 상태 |
| `src/store.ts` | localStorage subscribe |
| `src/hooks.ts` | typed Redux hooks |
| `src/components/Report/ReportParts.tsx` | Report UI 분리 |
| `src/pages/gps/AssemblyNavigation.tsx` | GPS watchPosition 수정 |

### 참고 문서

| 문서 | 내용 |
|------|------|
| [TROUBLESHOOTING_GPS.md](./TROUBLESHOOTING_GPS.md) | GPS watchPosition 루프 상세 |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | 상태 코드·캐시 등 일반 이슈 |
| [TROUBLESHOOTING_PORTFOLIO.md](./TROUBLESHOOTING_PORTFOLIO.md) | 포트폴리오용 사례 정리 |

---

## 개선 작업 체크리스트 (신규 기능 추가 시)

새 페이지·API를 추가할 때 아래를 확인합니다.

- [ ] API 호출은 `src/api/` 모듈에 추가했는가?
- [ ] 차량 매핑은 `vehicleMapper.ts`를 재사용했는가?
- [ ] 300줄 이상 페이지는 컴포넌트·hooks 분리를 검토했는가?
- [ ] 무거운 라이브러리는 lazy import 또는 해당 라우트 lazy 로딩인가?
- [ ] `useEffect` deps에 콜백 내부에서 갱신하는 state가 없는가?
- [ ] 리스트 50행 이상이면 memo·가상 스크롤을 검토했는가?
- [ ] 동일 API를 2곳 이상 호출하면 캐싱(React Query 등)을 검토했는가?
