# 식물환자 — 재배 환경 · 관수 대시보드 (테스트 모드)

식물 재배 환경과 관수량을 확인·조절하는 **모바일 우선 반응형 웹앱**입니다.
2026 연암SMART팜 융복합 공모전 발표(식물환자)의 시연용 앱입니다.

> ⚠️ **현재 실제 센서와 관수 장치는 연결되어 있지 않습니다.**
> 화면의 모든 값은 사용자가 '테스트 설정'에서 입력한 **테스트값** 또는 그 값을 바탕으로 만든 **시뮬레이션**이며, 화면에도 항상 그렇게 표시됩니다.
> 카메라 기능은 없습니다.

- 공개 주소: https://skysky02209.github.io/sikmul-hwanja/
- 저장소: https://github.com/skysky02209/sikmul-hwanja

## 기능

| 화면 | 내용 |
|---|---|
| 대시보드 | 당도(Brix, 핵심 지표) · 외부/내부 온도 · 외부/내부 습도 · 낮/밤 · 날씨 · 기본 관수량/감량값/최종 관수량 · 온실 그림 · 24시간 시뮬레이션 추이 |
| 테스트 설정 | 위 값을 직접 입력/선택 (숫자 입력 + 슬라이더, 범위 검증). 입력 즉시 대시보드에 미리 반영. **저장**(브라우저에 유지) · **되돌리기** · **초기화** |
| 관수 적용 | 현재 설정값(기본·감량·최종 관수량)을 보여 주고 **테스트 모드라 장치로 명령을 보내지 않았음**을 알림. 이번 접속의 적용 기록 표시 |
| 감량 시뮬레이션 | 발표자료 '작동 원리'를 옮긴 가상 실험: 하루 한 계단 감량(100→90→80→70%) · 감량 구역 vs 대조 구역 클릭 수 · 멈춤/경보 판정 · 멈춘 지점별 예상 당도·수량·10a 소득 (모두 가정값) |

- 최종 관수량 = 기본 관수량 − 감량값, **0 미만이면 0** (`src/domain/irrigation.js`)
- 입력 범위: 외부 온도 −30~50°C, 내부 온도 −10~50°C, 습도 0~100%, 관수량·감량값 0~5000 L/일, 당도 0~30°Bx (`src/domain/model.js`)
- 저장 위치: 브라우저 localStorage `sikmul-hwanja.testSettings.v1` (손상된 값은 무시하고 기본값 사용)
- 접근성: 모든 입력에 라벨·오류 문구 연결(aria-describedby), 결과 영역 aria-live, 키보드 탭/대화상자, 44px 터치 영역, 다크 모드, 움직임 줄이기 대응

## 실행

```bash
npm install
npm run dev       # 개발 서버 http://localhost:5173
npm test          # 단위 테스트 (vitest)
npm run build     # 프로덕션 빌드 → docs/
npm run preview   # 빌드 결과 확인 http://localhost:4173
```

## 배포 (GitHub Pages)

- 빌드 결과는 `docs/`에 생성되고, GitHub Pages가 **main 브랜치 /docs**를 게시합니다. (`vite.config.js`의 `base: './'` 덕분에 하위 경로에서도 동작)
- 맥에서 **`deploy.command`를 Finder에서 더블클릭**하면: 빌드 → 커밋 → push → Pages 설정까지 진행하고 주소를 엽니다.
- GitHub 토큰은 파일이나 저장소에 저장하지 않습니다. 맥 키체인에 저장된 git 자격증명을 실행할 때만 읽습니다.

## 구조 (화면 · 데이터 모델 · 제공자 · API 분리)

```
src/
  domain/            순수 로직 (화면·장치와 무관, 단위 테스트 대상)
    model.js           데이터 모델·입력 범위·기본 테스트값·출처(SOURCE: test/sensor)
    irrigation.js      최종 관수량·감량률 계산
    validate.js        입력 검증·저장값 정리
    simulation.js      24시간 추이 시뮬레이션 (예시 곡선)
    brakeSim.js        감량 브레이크 시뮬레이션 (발표자료 수치 재현)
  data/
    providers/
      simulationProvider.js   테스트값 → 측정값 형식 (source: 'test')
      sensorProvider.js       실제 센서 자리 — 현재 미연결 (isConnected() = false)
    providerRegistry.js       연결된 제공자 선택 (지금은 항상 시뮬레이션)
  api/
    irrigationController.js   관수 장치 제어 경계 — 지금은 테스트 모드 컨트롤러만 (명령 전송 없음)
  storage/settingsStore.js    브라우저 저장
  ui/                         React 화면
tests/domain.test.js          단위 테스트
```

### 향후 장치 연동 방법

1. **센서**: `sensorProvider.getSnapshot()`이 `simulationProvider`와 **같은 모양**의 객체를 돌려주게 구현하고, 각 값의 `source`를 `'sensor'`로 채운 뒤 `isConnected()`가 실제 연결 상태를 반환하게 합니다. 화면은 `source`를 보고 '테스트값'/'센서값' 표시를 자동으로 바꿉니다.
2. **관수 장치**: `irrigationController.js`에 `{ mode: 'device', isConnected(), apply(plan) }` 모양의 컨트롤러를 추가하고, `getIrrigationController()`에서 연결된 경우에만 그것을 고릅니다. `plan`은 `{ baseLitersPerDay, reductionLitersPerDay, finalLitersPerDay }`입니다.
3. 장치 주소·키는 코드에 넣지 말고 빌드 환경변수나 서버 쪽 비밀 저장소를 사용하세요.

현재 이 앱에는 실제 센서·장치·외부 API 연결이 **없습니다.**

## 시뮬레이션 데이터 근거 (가정값)

- 감량 구역 클릭 수: Khait et al., *Cell* (2023) — 물 부족 토마토 약 35회/시간, 정상 1회 미만 → 그 사이를 단계별로 나눈 가정
- 멈춤 기준: 대조 구역의 3배 이상, 경보 기준: 15회/시간 이상 (가정)
- 10a 소득: 발표자료 시나리오(기준 2,437만 원 · 적정선 −12%/+30% → 3,042만 원 · 선을 넘음 −24%/+30% → 2,387만 원)를 재현하도록 조수입 4,201.4만 원·경영비 1,764.4만 원으로 역산
- 단계별 당도·수량·단가는 예시값이며 실제 측정이 아닙니다.
