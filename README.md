# fire_frontend

소방동원차량 관리 시스템의 **프론트엔드** 저장소입니다.

## 구성

| 경로 | 설명 |
|------|------|
| [`fire-front/`](./fire-front/) | React + Vite SPA (관제·차량용 GPS 화면) |# 소방동원차량 관리 프로그램 (Fire Front)

소방 자원(차량) 등록·배분·관제를 위한 **웹 관리자·차량용 모바일 화면**을 제공하는 React SPA입니다. 백엔드 REST API(`/api`)와 연동하며, 프로덕션에서는 **Nginx**로 정적 배포 및 API 프록시를 사용합니다.

## 기술 스택

| 구분 | 사용 |
|------|------|
| 프레임워크 | React 19, TypeScript |
| 빌드 | Vite 7 |
| 상태 관리 | Redux Toolkit |
| 스타일 | Tailwind CSS 4 |
| HTTP | Axios (`/api` 기준) |
| 지도·경로 | Kakao Maps SDK, Tmap Open API |
| 기타 | Recharts(통계), xlsx(엑셀 일괄 등록) |

## 주요 기능

### 관제·관리 (데스크톱)

- **메인**: 요약 통계, 일기예보(기상청 API 프록시)
- **자원등록** (`/status`): 신규 차량 등록, 엑셀 일괄 등록, 등록 차량 관리(필터·수정·선택 삭제)
- **자원배분** (`/manage`): 출동 편성 표, 출동 생성·문자 발송
- **자원관리** (`/activity`): 활동 차량 목록·지도
- **지도** (`/map`): 차량·GPS 위치 표시
- **통계** (`/statistics`): 출동·활동 로그 기반 통계
- **보고서** (`/report`): 기간별 보고서

### 차량·현장용 (모바일·GPS)

- **자원집결 응소** (`/gps/assembly`): 집결지 안내, GPS 권한, 응소 OK 후 네비 이동
- **집결지 네비** (`/gps/assemblynav`): 카카오맵·Tmap 경로, 위치 주기 전송, **자원집결완료**(상태 대기·집결 완료)
- **출동 준비/대기/네비** (`/gps/ready`, `/gps/standby`, `/map/navigation`)

### 차량 상태 코드 (백엔드와 일치)

| 코드 | 의미 |
|------|------|
| 0 | 대기 |
| 1 | 활동 |
| 2 | 철수 |
| 3 | 집결중 |

등록 직후 `PATCH /vehicles/{id}/status`로 **집결중(3)** 설정, 자원집결완료 시 **대기(0)** 로 전환합니다.

## 시작하기

### 요구 사항

- Node.js 20+ 권장
- npm 10+

### 설치

```bash
cd fire-front
npm install
```

### 환경 변수

프로젝트 루트에 `.env` 파일을 두고 다음 변수를 설정합니다.

```env
VITE_KAKAOMAP_API_KEY=카카오_지도_JavaScript_키
VITE_TMAP_API_KEY=SK_Tmap_OpenAPI_앱키
```

- 빌드 시 `VITE_` 접두사가 붙은 변수만 클라이언트에 포함됩니다.
- 키는 저장소에 커밋하지 마세요.

### 개발 서버

```bash
npm run dev
```

기본적으로 `--host`로 LAN 접속이 가능합니다. API는 Vite 프록시 또는 동일 오리진의 `/api`로 연결되도록 구성하세요.

### 프로덕션 빌드

```bash
npm run build
```

산출물은 `dist/` 디렉터리입니다.

```bash
npm run preview   # 로컬에서 dist 미리보기
```

### 린트

```bash
npm run lint
```

## 배포 (요약)

1. `npm run build`로 `dist` 생성
2. Nginx `root`를 `dist`로 지정
3. `/api`를 백엔드(Spring Boot 등)로 `proxy_pass`
4. **Geolocation** 사용을 위해 `Permissions-Policy`에 `geolocation=(self)` 등 허용 설정 (전체 차단 시 브라우저에서 위치 API가 막힙니다)
5. HTTPS 권장 (모바일 Geolocation 정책)

자세한 트러블슈팅은 저장소의 `TROUBLESHOOTING.md`를 참고하세요.

## 프로젝트 구조 (요약)

```
src/
  api/           # Axios 인스턴스
  components/    # UI·헤더·통계·Status 등
  features/      # Redux 슬라이스 (vehicle 등)
  pages/         # 라우트별 페이지
  pages/gps/     # 차량용 GPS·집결·네비
  services/      # 등록 유틸 등
  types/         # TypeScript 타입
  Route.tsx      # React Router 정의
```

## 라이선스

이 저장소의 라이선스 정책은 상위 저장소(`fire_frontend`) 또는 조직 정책을 따릅니다.

## 문의

운영·백엔드 API 스펙은 Swagger 등 서버 문서와 함께 확인하세요.
