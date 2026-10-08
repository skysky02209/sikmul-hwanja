// 당도(Brix) 반응 모형 — 재배 조건이 좋으면 당도가 오르고, 나쁘면 떨어지도록 만든 교육·시연용 모형.
// ⚠ 연구·재배 기준을 바탕으로 단순화한 가정값이며, 실제 작물의 측정값이 아니다.
//
// 근거 (요약)
//  - 일반 토마토 당도 4~7°Bx, 약광에서 당 함량 낮아짐, 주간 적온 25~27℃·야간 17℃,
//    30℃ 이상 생육 불량, 10℃ 이하 생육 저하, 시설 습도 70~80% 권장 — 제주특별자치도농업기술원 토마토 재배 자료
//  - 온실 토마토 적정 VPD 0.8~1.1 kPa, 주간 21~27℃·야간 17~18℃ — FarmRoad 토마토 환경 분석
//  - 적당한 수분 부족(토양수분 60% vs 90%)에서 가용성 당 +48.7% — Liao et al., Foods (2024)
//  - 관수 감량 시 당도↑·수량↓ (25편 561실험 메타분석) — Lu et al., Agric. Water Manag. (2019)
//  - 물 부족 시 초음파 약 35회/시간, 정상 1회 미만 — Khait et al., Cell (2023)

export const BASE_BRIX = 5.5 // 일반 토마토 범위(4~7°Bx)의 가운데
export const BRIX_MIN = 3
export const BRIX_MAX = 13
/** 하루(24시간)에 목표값과의 차이를 약 45%씩 좁혀 간다 */
export const HOURLY_APPROACH = 1 / 40

/** 포화수증기압(kPa) — Tetens 식 */
export function saturationVaporPressure(t) {
  return 0.6108 * Math.exp((17.27 * t) / (t + 237.3))
}

/** 수증기압차 VPD(kPa) */
export function vpd(temp, rh) {
  return Math.round(saturationVaporPressure(temp) * (1 - rh / 100) * 100) / 100
}

/** 관수 감량률(%) — 기본 관수량 대비 */
export function deficitPct(base, reduction) {
  // 기본 관수량이 0이면 물을 전혀 주지 않는 상태 → 감량률 100% (최대 가뭄)
  if (!(base > 0)) return 100
  return Math.min(100, Math.max(0, (reduction / base) * 100))
}

const r1 = (n) => Math.round(n * 100) / 100

/** 1) 수분(관수 감량) 효과 */
export function waterEffect(d) {
  let v
  let note
  if (d < 5) {
    v = -0.3 + 0.08 * d
    note = '감량이 거의 없어 당이 희석된 상태'
  } else if (d <= 35) {
    v = 0.08 * d
    note = d <= 30 ? '적당한 수분 스트레스 → 당 농축·축적' : '당도는 높지만 수량 손해가 커지는 구간'
  } else if (d <= 50) {
    v = 2.8 - 0.04 * (d - 35)
    note = '과도한 감량 → 수량 급감, 당도 상승 둔화'
  } else {
    v = 2.2 - 0.12 * (d - 50)
    note = '심한 가뭄 스트레스 → 광합성 저하로 당도 하락'
  }
  const tone = d >= 5 && d <= 30 ? 'good' : d > 50 || d < 5 ? 'bad' : 'warn'
  return { key: 'water', label: '관수 감량', value: r1(v), detail: `감량률 ${Math.round(d)}%`, note, tone }
}

/** 2) 온도 효과 (낮/밤 구분) */
export function temperatureEffect(t, period) {
  let v = 0
  let note
  if (period === 'night') {
    if (t >= 15 && t <= 18) { v = 0.3; note = '밤 적온 → 호흡 소모가 적어 당이 남음' }
    else if (t > 18 && t <= 22) { v = 0; note = '밤 온도 약간 높음' }
    else if (t > 22) { v = -0.2 * (t - 22); note = '밤 고온 → 호흡으로 당 소모' }
    else if (t >= 12) { v = 0; note = '밤 온도 약간 낮음' }
    else { v = -0.15 * (12 - t); note = '밤 저온 → 생육 지연' }
  } else {
    if (t >= 25 && t <= 27) { v = 0.3; note = '낮 적온(25~27℃) → 광합성 활발' }
    else if (t >= 21 && t < 25) { v = 0; note = '낮 온도 양호' }
    else if (t > 27 && t <= 30) { v = 0; note = '낮 온도 약간 높음' }
    else if (t > 30) { v = -0.25 * (t - 30) - (t > 35 ? 0.2 * (t - 35) : 0); note = '30℃ 이상 고온 → 생육 불량·당 축적 저하' }
    else if (t > 10) { v = -0.12 * (21 - t); note = '낮 저온 → 광합성·당 축적 느림' }
    else { v = -1.32 - 0.2 * (10 - t); note = '10℃ 이하 → 생육 저하' }
  }
  v = Math.max(-3, v)
  const tone = v > 0 ? 'good' : v < -0.4 ? 'bad' : v < 0 ? 'warn' : 'neutral'
  return { key: 'temp', label: '내부 온도', value: r1(v), detail: `${t}℃ (${period === 'night' ? '밤' : '낮'})`, note, tone }
}

/** 3) 습도 효과 — 내부 온도·습도로 VPD 계산 */
export function humidityEffect(t, rh) {
  const d = vpd(t, rh)
  let v = 0
  let note
  if (d >= 0.8 && d <= 1.1) { v = 0.2; note = '적정 VPD(0.8~1.1kPa) → 증산·양분 이동 원활' }
  else if (d >= 0.5 && d < 0.8) { v = 0; note = '약간 습함' }
  else if (d > 1.1 && d <= 1.5) { v = 0; note = '약간 건조' }
  else if (d < 0.5) { v = -0.6; note = '과습 → 증산 저하·잿빛곰팡이병 위험' }
  else { v = -Math.min(1.2, 0.15 * ((d - 1.5) / 0.1)); note = '너무 건조 → 기공이 닫혀 광합성 감소' }
  if (rh > 90) { v -= 0.3; note += ' · 습도 90% 초과' }
  const tone = v > 0 ? 'good' : v <= -0.5 ? 'bad' : v < 0 ? 'warn' : 'neutral'
  return { key: 'humidity', label: '내부 습도', value: r1(v), detail: `${rh}% · VPD ${d}kPa`, note, tone }
}

/** 4) 빛(날씨) 효과 — 밤에는 광합성이 없어 0 */
export function lightEffect(weather, period) {
  if (period === 'night') return { key: 'light', label: '빛 (날씨)', value: 0, detail: '밤', note: '밤에는 광합성이 없음', tone: 'neutral' }
  const table = {
    clear: [0.5, '맑음 → 광합성으로 당 생산 많음', 'good'],
    cloudy: [-0.3, '흐림 → 빛 부족으로 당 생산 감소', 'warn'],
    rain: [-0.7, '비 → 약광, 당 함량 낮아짐', 'bad'],
    snow: [-0.9, '눈 → 매우 약한 빛, 당 생산 크게 감소', 'bad'],
  }
  const [v, note, tone] = table[weather] ?? [0, '', 'neutral']
  const label = { clear: '맑음', cloudy: '흐림', rain: '비', snow: '눈' }[weather] ?? weather
  return { key: 'light', label: '빛 (날씨)', value: v, detail: label, note, tone }
}

/** 식물환자 초음파 클릭 수(회/시간) — 관수 비율로 보간 (발표 작동 원리와 같은 가정) */
const CLICK_POINTS = [
  [100, 0.6], [90, 1.0], [80, 1.6], [70, 6], [60, 32], [50, 45], [0, 60],
]
export function clicksForWater(waterPct) {
  const w = Math.min(100, Math.max(0, waterPct))
  for (let i = 0; i < CLICK_POINTS.length - 1; i += 1) {
    const [w1, c1] = CLICK_POINTS[i]
    const [w2, c2] = CLICK_POINTS[i + 1]
    if (w <= w1 && w >= w2) return Math.round((c2 + ((w - w2) / (w1 - w2)) * (c1 - c2)) * 10) / 10
  }
  return 0.6
}

/** 수량 지수(%) — 발표 시나리오(−12%·−24%)와 같은 가정 */
export function yieldIndex(d) {
  const pts = [[0, 100], [10, 94], [20, 88], [30, 76], [40, 64], [50, 50], [100, 10]]
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [d1, y1] = pts[i]
    const [d2, y2] = pts[i + 1]
    if (d >= d1 && d <= d2) return Math.round(y1 + ((d - d1) / (d2 - d1)) * (y2 - y1))
  }
  return 10
}

/** 식물환자 판정 */
export function plantSignal(d) {
  const clicks = clicksForWater(100 - d)
  const control = 0.6
  if (clicks >= 15) return { state: 'alarm', clicks, label: '경보 — 즉시 관수' }
  if (clicks >= control * 3) return { state: 'brake', clicks, label: '멈춤 신호 — 감량 중단·한 계단 복귀' }
  return { state: 'continue', clicks, label: '정상 — 감량 계속 가능' }
}

/**
 * 현재 조건에서 당도가 향해 가는 목표값과 요인별 기여도.
 * @param {object} s 설정값 (insideTemp, insideHumidity, baseIrrigation, irrigationReduction, period, weather)
 */
export function evaluateConditions(s) {
  const d = deficitPct(s.baseIrrigation, s.irrigationReduction)
  const factors = [
    waterEffect(d),
    temperatureEffect(s.insideTemp, s.period),
    humidityEffect(s.insideTemp, s.insideHumidity),
    lightEffect(s.weather, s.period),
  ]
  const raw = BASE_BRIX + factors.reduce((a, f) => a + f.value, 0)
  const target = Math.round(Math.min(BRIX_MAX, Math.max(BRIX_MIN, raw)) * 10) / 10
  return { target, factors, deficit: Math.round(d), signal: plantSignal(d), yieldPct: yieldIndex(d) }
}

/** 시뮬레이션 1시간 진행 */
export function stepBrix(current, target, hours = 1) {
  let b = current
  for (let i = 0; i < hours; i += 1) b += (target - b) * HOURLY_APPROACH
  return Math.round(b * 1000) / 1000
}

/** 낮/밤 자동 순환 시 시뮬레이션 시각의 낮/밤 (6~18시 낮) */
export function periodAtHour(startHour, elapsed) {
  const h = (startHour + elapsed) % 24
  return h >= 6 && h < 18 ? 'day' : 'night'
}
