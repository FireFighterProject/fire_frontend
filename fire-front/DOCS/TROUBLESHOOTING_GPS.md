# 트러블슈팅 \ GPS watchPosition 무한 재등록 루프 문제

---

## 1. 문제발견

소방차가 자원집결지로 이동하는 동안 운전자 기기에서 현재 위치를 추적하는 `watchPosition`을 구현하던 중,  
**이동을 시작하는 순간부터** GPS 마커가 주기적으로 깜빡이며 관제 화면에 위치가 띄엄띄엄 수신되는 현상을 발견했다.

콜백 내부에서 ETA를 계산할 때 최신 속도값을 읽어야 해서 `currentSpeedKph`를 `deps`에 추가했는데,  
`setCurrentSpeedKph`를 호출할 때마다 `useEffect`가 재실행되며 **clearWatch → 재등록 루프**가 발생했다.  
정차 중에는 증상이 없다가 출발 직후부터 반복되어 초기에 원인 파악이 어려웠다.

```tsx
// 문제의 원 코드
useEffect(() => {
    const watchId = navigator.geolocation.watchPosition((pos) => {
        ...
        setCurrentSpeedKph(speed); // state 업데이트 → deps 변화 유발
        ...
        const speedKph = currentSpeedKph ?? 40; // 최신값을 읽으려고 deps에 추가
    }, ...);

    return () => navigator.geolocation.clearWatch(watchId); // 루프마다 추적 해제
}, [map, destLat, destLon, currentSpeedKph]); // ← currentSpeedKph가 deps!
```

---

## 2. 해결시도

`useRef`로 **계산용**과 **표시용**을 분리해, `deps`를 오염시키지 않고 콜백 내에서 항상 최신값을 읽도록 했다.  
`ref`는 값이 바뀌어도 React 렌더링을 트리거하지 않으므로 `useEffect` 재실행이 발생하지 않는다.

```tsx
// AssemblyNavigation.tsx 수정

const speedRef = useRef<number | null>(null);           // 콜백 계산용 (deps 비오염)
const [displaySpeed, setDisplaySpeed] = useState<number | null>(null); // UI 표시용

useEffect(() => {
    const watchId = navigator.geolocation.watchPosition((pos) => {
        ...
        const speed = (distM / dtSec) * 3.6;
        speedRef.current = speed;      // ref 업데이트 → 렌더링 없음
        setDisplaySpeed(speed);        // UI 표시만 state로

        const speedKph = speedRef.current ?? 40; // ref로 최신값 읽기 (stale closure 없음)
        setRemainingTimeSec(d / ((speedKph * 1000) / 3600));
    }, ...);

    return () => navigator.geolocation.clearWatch(watchId);
}, [map, destLat, destLon]); // currentSpeedKph 완전히 제거
```

---

## 3. 결과

`ref` 도입 후 `watchPosition`은 지도 초기화·목적지 설정 시 최대 2회만 등록되고,  
이동 중 GPS 추적이 끊기지 않아 관제 화면에 차량 위치가 5초 간격으로 연속 수신되었다.  
콜백 내에서 최신 속도를 정확히 읽어 ETA 계산도 실측값 기반으로 정상 동작하는 **부수 버그도 함께 해결**되었다.
