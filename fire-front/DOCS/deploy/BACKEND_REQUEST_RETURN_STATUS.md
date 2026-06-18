# 백엔드 수정 요청서 — 차량 복귀중 상태 및 재출동

**요청일:** 2026-06-17  
**요청자:** 프론트엔드 (fire-front)  
**대상:** fire_response_system 백엔드 (Spring Boot)

---

## 1. 배경

단말기(출동 URL)에서 **상황 종료** 시 관제 화면에 차량이 **복귀중**으로 표시되어야 하며,  
**복귀중 차량은 자원배분(/manage)에서 다시 출동 편성**할 수 있어야 합니다.

프론트엔드는 백엔드 status 코드 **2**를 화면에서 **「복귀중」**으로 표시하도록 수정했습니다.  
(백엔드 OpenAPI 명칭: `2=철수`)

---

## 2. 현재 백엔드 동작 (확인됨)

| 항목 | 내용 |
|------|------|
| `PATCH /api/vehicles/{id}/status` | `status: 2` 허용 (철수) |
| `POST /api/dispatch-orders/{orderId}/return` | **차량 상태를 0(대기)로 변경** (문서 기준) |
| `POST /api/dispatch-orders/{orderId}/assign` | 편성 가능 여부에 **status=0(대기)만** 허용하는지 확인 필요 |
| `POST /api/sms/to-vehicle` | 연락처 없을 때 400 / 일부 환경에서 `전송 대상을 선택합니다...` 메시지 |

---

## 3. 요청 사항

### 3-1. 복귀 처리 시 status=2 유지 (필수)

**요청:** 단말기·관제에서 복귀 처리 시 차량 status를 **2(복귀중/철수)** 로 설정하고,  
`POST /api/dispatch-orders/{orderId}/return` 호출 시에도 **0(대기)이 아닌 2**로 변경하거나,  
return API와 status PATCH 동작을 일치시켜 주세요.

**이유:** 복귀 직후 곧바로 **대기**로 바뀌면 활동 현황·자원배분 집계가 어긋납니다.

**권장 스펙:**

```
status 코드:
  0 = 대기
  1 = 활동
  2 = 복귀중  (기존 '철수' 명칭 → API 문서·응답에 '복귀중' 별칭 추가 권장)
  3 = 집결중
```

### 3-2. 복귀중 차량 재출동 편성 허용 (필수)

**요청:** `POST /api/dispatch-orders/{orderId}/assign` 시  
`vehicle.status IN (0, 2)` 인 차량은 편성 가능하도록 변경.

**검증 시나리오:**

1. 차량 A status=1(활동) → 단말기에서 상황 종료 → status=2
2. `/activity` 목록에서 A 제외 확인
3. `/manage` 경북 **복귀중** 행에 A 포함 → 편성 → 출동 생성 성공
4. 편성 후 A status=1(활동)으로 변경

### 3-3. SMS API 응답 정리 (권장)

**요청:** `POST /api/sms/to-vehicle` 실패 시

- HTTP 400 + JSON `{ "message": "..." }` 형식 유지
- 브라우저 `alert`에 그대로 노출되지 않도록, 프론트는 연락처 없으면 API 호출 생략 처리함
- 백엔드: `phoneNumber`/`psLteNumber` 없을 때 명확한 메시지 (`차량 연락처가 없습니다` 등)

### 3-4. OpenAPI 문서 갱신 (권장)

- status=2 설명: `철수` → `복귀중(철수)`  
- `GET /api/dispatch-orders/vehicle/{vehicleId}` (기존 latest-by-vehicle 대체 경로) 문서 유지
- assign 시 허용 status 목록 명시

---

## 4. 프론트엔드 적용 내용 (참고)

| 파일 | 변경 |
|------|------|
| `GPSStandby.tsx` | 종료 시 `PATCH status=2`, vehicle 쿼리 수신 |
| `NavigationPage.tsx` | 종료 시 status=2 + `/gps/standby?vehicle=` 이동 |
| `Activity.tsx` | 수동 복귀 → status=2 |
| `manage.tsx` | **대기·복귀중 행 분리** 표시(녹색/노란색), 두 상태 모두 편성 허용, SMS 연락처 없으면 발송 생략 |
| `vehicleMapper` / `status.ts` | 코드 2 → 라벨 「복귀중」 |

---

## 5. 완료 기준 (Acceptance Criteria)

- [ ] 단말기 URL에서 상황 종료 후 DB `vehicles.status = 2`
- [ ] `/activity`에 해당 차량 미표시, `/manage` **복귀중** 행 집계에 포함(대기 행과 분리)
- [ ] 복귀중 차량으로 신규 출동 assign 성공
- [ ] SMS 연락처 없는 차량은 500 없이 스킵 가능
- [ ] Swagger에 status=2 복귀중 설명 반영

---

## 6. 담당자 회신 요청

- assign 로직 수정 일정
- return API 동작 변경 가능 여부
- status=2 공식 명칭 (`복귀중` vs `철수`) 확정
