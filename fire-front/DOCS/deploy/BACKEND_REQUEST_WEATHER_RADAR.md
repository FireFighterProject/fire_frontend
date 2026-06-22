# 백엔드 구현 명세서 — 강수 레이더 프록시 API

**문서 버전:** 1.0 (확정)  
**작성일:** 2026-06-18  
**요청자:** 프론트엔드 (fire-front)  
**대상:** fire_response_system 백엔드 (Spring Boot)  
**참고:** [기상청 날씨누리 레이더](https://www.weather.go.kr/w/weather/radar/rain.do) · [기상청 API허브 레이더](https://apihub.kma.go.kr/apiList.do?seqApi=5)

---

## 1. 배경 및 목적

### 1-1. 현재 문제 (프론트 단독 구현 한계)

| 증상 | 원인 |
|------|------|
| 타일 경계 깨짐·흰 줄 | 카카오 지도 투영 ≠ RainViewer Web Mercator 타일 |
| `429 Too Many Requests` | 브라우저가 RainViewer 타일을 직접 다수 요청 |
| 드래그 시 레이어 끊김 | 클라이언트에서 타일 재조립·재요청 |
| 기상청 사이트 대비 품질 저하 | 비공식 글로벌 소스 + 무캐시 클라이언트 로드 |

프론트는 임시로 RainViewer를 쓰고 있으나, **운영 품질 목표는 기상청 공식 레이더**입니다.

### 1-2. 목표

- 브라우저는 **우리 백엔드(`/api/weather/radar/*`)만** 호출
- 기상청 API허브 **레이더 합성영상(HSR)** 을 서버에서 수집·캐시·재배포
- 카카오 지도 위에 **위경도 bounds가 고정된 단일 PNG** 로 올려 날씨누리급 안정성 확보
- KMA 장애 시 **서버 측 RainViewer 폴백** (클라이언트 429 방지)

---

## 2. 범위

### 포함 (필수)

- 레이더 메타 API 1종
- 레이더 이미지 API 1종 (PNG)
- 기상청 API허브 연동 + 서버 캐시
- Swagger 문서 반영

### 포함 (권장)

- 최근 12프레임(1시간, 5분 간격) 목록 제공 — 추후 애니메이션용
- RainViewer 서버 폴백

### 제외 (이번 스코프)

- 낙뢰 레이어
- 레이더 예측(1H QPF) 애니메이션 UI
- XYZ 타일 방식 (2단계 옵션으로만 명시)

---

## 3. 사전 준비 (백엔드·운영)

### 3-1. 기상청 API허브 키 발급

1. [기상청 API허브](https://apihub.kma.go.kr/) 회원가입
2. 아래 API **활용신청** 후 `authKey` 발급

| 우선순위 | API명 (API허브) | 용도 |
|----------|-----------------|------|
| **1순위** | **3.1 레이더합성장 한반도조회** | 한반도 단일 합성 PNG + bounds |
| 2순위 | 2.1 HSR 합성파일 정보 / 4.1 레이더-HSR (그래픽) | 1순위 불가 시 대체 |
| 폴백 | RainViewer `weather-maps.json` + tile | KMA 전면 장애 시 |

3. 서버 환경변수 등록 (프론트·Git 커밋 금지)

```properties
# application-prod.properties (예시)
kma.apihub.auth-key=${KMA_APIHUB_AUTH_KEY}
kma.apihub.radar.enabled=true
weather.radar.cache-dir=/var/cache/fire/radar
weather.radar.fallback-rainviewer=true
```

### 3-2. 한반도 기본 bounds (고정값)

프론트·백엔드 공통 기준 (LCC 투영 한반도 합성영상 기본 범위):

```json
{
  "north": 43.0,
  "south": 33.0,
  "west": 124.0,
  "east": 132.0
}
```

KMA 응답에 bounds가 포함되면 **KMA 값 우선**, 없으면 위 기본값 사용.

---

## 4. REST API 명세 (확정)

Base path: `/api/weather/radar`  
인증: 기존 관제 API와 동일 (세션/JWT 등 프로젝트 공통 정책)  
Content-Type: JSON (메타) / `image/png` (이미지)

---

### 4-1. `GET /api/weather/radar/meta`

최신 레이더 프레임 정보 및 bounds. **프론트는 레이더 ON 시 이 API만 먼저 호출.**

#### Query

없음

#### Response `200 OK`

```json
{
  "source": "kma",
  "updatedAt": "2026-06-18T13:35:00+09:00",
  "intervalMinutes": 5,
  "bounds": {
    "north": 43.0,
    "south": 33.0,
    "west": 124.0,
    "east": 132.0
  },
  "latest": {
    "frameId": "202606181335",
    "observedAt": "2026-06-18T13:35:00+09:00",
    "imagePath": "/api/weather/radar/frames/202606181335/image"
  },
  "frames": [
    {
      "frameId": "202606181330",
      "observedAt": "2026-06-18T13:30:00+09:00",
      "imagePath": "/api/weather/radar/frames/202606181330/image"
    },
    {
      "frameId": "202606181335",
      "observedAt": "2026-06-18T13:35:00+09:00",
      "imagePath": "/api/weather/radar/frames/202606181335/image"
    }
  ]
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `source` | string | O | `kma` \| `rainviewer` |
| `updatedAt` | string (ISO-8601, KST) | O | 메타 갱신 시각 |
| `intervalMinutes` | number | O | 프레임 간격 (기본 5) |
| `bounds` | object | O | 이미지 지리 범위 (deg) |
| `latest` | object | O | 가장 최신 프레임 |
| `latest.frameId` | string | O | `yyyyMMddHHmm` (KST) |
| `latest.observedAt` | string | O | 관측 시각 |
| `latest.imagePath` | string | O | **상대 경로** (프론트가 origin 붙여 사용) |
| `frames` | array | O | 최근 N개 (기본 12, 오래된 순) |

#### Response `503 Service Unavailable`

```json
{
  "message": "레이더 데이터를 일시적으로 불러올 수 없습니다.",
  "retryAfterSeconds": 60
}
```

#### 캐시 정책 (백엔드 내부)

- 메타 응답: **60초** 메모리 캐시
- KMA 폴링: **5분** 주기 스케줄러 (`@Scheduled`)

---

### 4-2. `GET /api/weather/radar/frames/{frameId}/image`

단일 레이더 PNG. 카카오 지도 `CustomOverlay` / bounds 오버레이에 사용.

#### Path

| 파라미터 | 형식 | 예시 |
|----------|------|------|
| `frameId` | `yyyyMMddHHmm` | `202606181335` |

#### Query (선택)

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| `opacity` | 무시 (프론트 CSS 처리) | 예약 필드 |

#### Response `200 OK`

- Body: **PNG 바이너리**
- Headers:

```http
Content-Type: image/png
Cache-Control: public, max-age=300
X-Radar-Frame-Id: 202606181335
X-Radar-Observed-At: 2026-06-18T13:35:00+09:00
X-Radar-Bounds: 124.0,33.0,132.0,43.0
```

`X-Radar-Bounds` 형식: `west,south,east,north` (WGS84, 쉼표 구분)

#### Response `404 Not Found`

```json
{
  "message": "해당 시각의 레이더 프레임이 없습니다.",
  "frameId": "202606181335"
}
```

#### 캐시 정책 (백엔드 내부)

- 디스크/Redis: 프레임별 PNG **24시간** 보관
- 동일 `frameId` 재요청 시 KMA 재호출 없이 캐시 반환

---

### 4-3. (선택·2단계) `GET /api/weather/radar/tiles/{frameId}/{z}/{x}/{y}.png`

> 1단계(합성 PNG) 배포 후 요청 시 구현. 프론트는 1단계만으로 운영 가능.

RainViewer/KMA 타일을 서버에서 프록시할 때만 사용.  
클라이언트 직접 RainViewer 호출 **금지**.

---

## 5. 백엔드 내부 구현 가이드

### 5-1. 패키지 구조 (권장)

```
com.fire.weather
  ├── controller.WeatherRadarController
  ├── service.WeatherRadarService
  ├── client.KmaRadarApiClient
  ├── client.RainViewerFallbackClient
  ├── cache.RadarFrameCache
  └── scheduler.RadarSyncScheduler
```

### 5-2. KMA 연동 흐름

```
[RadarSyncScheduler] 5분마다
    → KmaRadarApiClient.fetchLatestPeninsulaFrame()
    → PNG 바이트 + observedAt + bounds 저장 (RadarFrameCache)
    → meta 캐시 무효화

[GET /meta]
    → 캐시 또는 DB/디렉터리에서 최근 12 frameId 목록 조립
    → JSON 반환

[GET /frames/{id}/image]
    → 캐시 hit → PNG 스트리밍
    → miss & KMA 가능 → fetch 후 저장 → 반환
    → miss & KMA 실패 → RainViewerFallbackClient (설정 시)
```

### 5-3. KMA API 호출 예시 (참고)

실제 URL·파라미터는 API허브 **활용신청 → URL 발행** 값을 사용합니다.  
아래는 HSR 그래픽 계열 예시이며, **한반도 조회 API(3.1)가 있으면 그쪽을 우선 적용**하세요.

```
GET https://apihub.kma.go.kr/api/typ03/cgi/rdr/nph-rdr_cmp1_imgp
  ?authKey={KMA_APIHUB_AUTH_KEY}
  &tm={yyyyMMddHHmm}
  &dataDtlCd=rdr_hsr_0
  &... (API허브 발행 URL의 고정 파라미터)
```

- `tm`: 관측 시각 (KST, 5분 단위 내림)
- 응답이 JSON이면 이미지 상대경로 포함 → `https://apihub.kma.go.kr` 접두사 붙여 PNG 다운로드
- 응답이 PNG면 그대로 저장

### 5-4. RainViewer 폴백 (서버 전용)

```properties
weather.radar.fallback-rainviewer=true
```

- `source: "rainviewer"` 로 meta 반환
- 한반도 viewport 기준 **단일 합성 이미지**를 서버에서 타일 stitch 후 PNG 저장 (클라이언트 타일 요청 없음)
- 폴백 사용 시 `bounds`는 §3-2 고정값

### 5-5. 스케줄러

| 작업 | 주기 | 설명 |
|------|------|------|
| `syncLatestRadarFrame` | 5분 | KMA 최신 프레임 수집 |
| `purgeOldFrames` | 1일 1회 | 24시간 초과 파일 삭제 |

---

## 6. Swagger 등록 예시

```yaml
/api/weather/radar/meta:
  get:
    tags: [Weather]
    summary: 강수 레이더 메타 (최신 프레임·bounds)
    responses:
      '200':
        description: OK
      '503':
        description: 레이더 원천 장애

/api/weather/radar/frames/{frameId}/image:
  get:
    tags: [Weather]
    summary: 강수 레이더 PNG 이미지
    parameters:
      - name: frameId
        in: path
        required: true
        schema:
          type: string
          example: "202606181335"
    responses:
      '200':
        description: PNG
        content:
          image/png: {}
      '404':
        description: 프레임 없음
```

기존 `GET /api/weather/village-forecast` 와 동일한 CORS·프록시(`/api` → Spring) 정책 적용.

---

## 7. 프론트엔드 연동 계약 (구현 완료 시 프론트가 할 일)

### 7-1. 변경 파일 (예정)

| 파일 | 변경 |
|------|------|
| `src/services/weather/radarApi.ts` | **신규** — meta/image fetch |
| `src/hooks/useKakaoRadarOverlay.ts` | 타일 방식 제거 → **bounds PNG 1장** 오버레이 |
| `src/services/weather/radarTiles.ts` | RainViewer 직접 호출 **삭제** |
| `src/services/weather/radarTileLoader.ts` | **삭제** |

### 7-2. 프론트 렌더링 방식 (확정)

1. 레이더 ON → `GET /api/weather/radar/meta`
2. `latest.imagePath` 로 PNG 로드 (blob URL)
3. 카카오 지도 bounds 오버레이:

```typescript
// bounds: meta.bounds (north, south, west, east)
const sw = new kakao.maps.LatLng(bounds.south, bounds.west);
const ne = new kakao.maps.LatLng(bounds.north, bounds.east);
const overlay = new kakao.maps.CustomOverlay({
  map,
  bounds: new kakao.maps.LatLngBounds(sw, ne),
  content: `<img src="${imageUrl}" style="width:100%;height:100%;opacity:0.5" />`,
  yAnchor: 1,
});
```

4. 지도 drag/zoom: **이미지 재요청 없음** (bounds에 고정) → 날씨누리와 동일 UX
5. 5분마다 meta 재조회 → `frameId` 변경 시에만 이미지 교체

### 7-3. 레이더 ON 시 지도 동작 (현행 유지)

- 한반도 밖이면 중심 이동
- 줌 레벨 **14** (최대 축소)
- 프론트 이미 반영됨 — 백엔드 연동 후에도 유지

---

## 8. 완료 기준 (Acceptance Criteria)

### 필수

- [ ] `GET /api/weather/radar/meta` 가 200 + 위 JSON 스키마 반환
- [ ] `GET /api/weather/radar/frames/{frameId}/image` 가 PNG 반환
- [ ] `X-Radar-Bounds` 헤더 포함
- [ ] KMA `authKey`가 **서버 env에만** 존재 (프론트 번들·응답 노출 없음)
- [ ] 동일 프레임 100회 요청 시 KMA 호출 **1회** (캐시 동작)
- [ ] Swagger에 두 엔드포인트 문서화
- [ ] 로컬 `npm run dev` 프록시로 프론트에서 `/api/weather/radar/meta` 호출 성공

### 권장

- [ ] 최근 12프레임 `frames[]` 제공
- [ ] KMA 장애 시 RainViewer 폴백 + `source: "rainviewer"`
- [ ] 503 + `retryAfterSeconds` 반환

### 프론트 통합 완료 (백엔드 배포 후)

- [ ] RainViewer 클라이언트 직접 호출 코드 제거
- [ ] 관제 메인 지도에서 레이더 ON 시 **깨짐·429 없음**
- [ ] 드래그·줌 시 레이어 **끊김 없음**

---

## 9. 테스트 시나리오

### TC-1 메타 조회

```bash
curl -s http://localhost:8080/api/weather/radar/meta | jq .
```

- `latest.frameId` 존재
- `bounds` 4값 숫자

### TC-2 이미지 조회

```bash
FRAME=$(curl -s http://localhost:8080/api/weather/radar/meta | jq -r .latest.frameId)
curl -s -D - "http://localhost:8080/api/weather/radar/frames/${FRAME}/image" -o /tmp/radar.png
file /tmp/radar.png   # PNG image data
```

### TC-3 캐시

동일 URL 10회 연속 호출 → KMA access 로그 1회만 증가

### TC-4 프론트 E2E

1. 메인 → 강수 레이더 ON
2. 네트워크 탭: `tilecache.rainviewer.com` **요청 0건**
3. ` /api/weather/radar/` 요청만 존재
4. 지도 드래그 10초 → 레이어 위치 안정

---

## 10. 일정·담당 회신 요청

| 항목 | 회신 요청 |
|------|-----------|
| KMA API허브 키 발급 담당 | |
| 구현 착수일 / 스테이징 배포일 | |
| 1단계(합성 PNG) 완료 예정일 | |
| RainViewer 폴백 포함 여부 | |
| bounds KMA 원본 vs 고정값 사용 여부 | |

---

## 11. 참고 링크

- [기상청 날씨누리 — 레이더·낙뢰](https://www.weather.go.kr/w/weather/radar/rain.do)
- [기상청 API허브 — 레이더](https://apihub.kma.go.kr/apiList.do?seqApi=5)
- [기상자료개방포털](https://data.kma.go.kr)
- 프론트 기존 단기예보 프록시: `GET /api/weather/village-forecast` (동일 패턴으로 확장)

---

## 12. 변경 이력

| 버전 | 일자 | 내용 |
|------|------|------|
| 1.0 | 2026-06-18 | 최초 확정 명세 |
