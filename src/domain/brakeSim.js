// 관수 감량 브레이크 시뮬레이션 — 발표자료(식물환자 본선 발표) 작동 원리를 그대로 옮긴 모형.
// ⚠ 모든 수치는 가정·예시이며 실제 측정이 아니다.
//
// 작동 원리 (발표 15쪽):
//  1) 하루 한 계단씩 관수 감량  2) 물을 충분히 준 대조 구역과 클릭 수 비교
//  3) 뚜렷이 늘면 멈추고 한 계단 복귀  4) 급증하면 즉시 관수 + 경보

/** 감량 단계 (기본 관수량 대비 %) */
export const LEVELS = Object.freeze([100, 90, 80, 70, 60])

/**
 * 단계별 가정값.
 * clicksPerHour: 감량 구역의 시간당 초음파 클릭 수 (Khait et al. 2023: 물 부족 시 약 35회/시간, 정상 1회 미만 → 그 사이를 단계로 나눈 가정)
 * yield / price: 발표 9쪽 시나리오 (적정선 −12%·+30%, 선을 넘음 −24%·+30%) 및 사이값 보간
 * brix: 예시 당도 (토마토 가정)
 */
export const LEVEL_MODEL = Object.freeze({
  100: { clicksPerHour: 0.6, yield: 1.0, price: 1.0, brix: 6.0 },
  90: { clicksPerHour: 1.0, yield: 0.94, price: 1.15, brix: 6.8 },
  80: { clicksPerHour: 1.6, yield: 0.88, price: 1.3, brix: 7.6 },
  70: { clicksPerHour: 6, yield: 0.76, price: 1.3, brix: 8.2 },
  60: { clicksPerHour: 32, yield: 0.64, price: 1.3, brix: 8.6 },
})

export const CONTROL_CLICKS_PER_HOUR = 0.6

/** 판정 기준 (가정): 대조 구역의 3배 이상이면 멈춤, 15회/시간 이상이면 경보 */
export const THRESHOLDS = Object.freeze({ brakeRatio: 3, alarmClicks: 15 })

/**
 * 10a 소득 모형 — 발표 9쪽 수치를 그대로 재현하도록 역산한 값.
 * 소득 = 조수입 × 수량비 × 단가비 − 경영비
 * 조수입 4,201.4만 원, 경영비 1,764.4만 원 → 기준 2,437 / 적정 3,042 / 선을 넘음 2,387
 */
export const INCOME_MODEL = Object.freeze({ grossRevenue: 4201.4, cost: 1764.4 })

export function incomeAt(level) {
  const m = LEVEL_MODEL[level]
  return Math.round(INCOME_MODEL.grossRevenue * m.yield * m.price - INCOME_MODEL.cost)
}

/** 한 단계의 판정 */
export function judge(level, control = CONTROL_CLICKS_PER_HOUR) {
  const clicks = LEVEL_MODEL[level].clicksPerHour
  if (clicks >= THRESHOLDS.alarmClicks) return { state: 'alarm', clicks, control, label: '즉시 경보 · 바로 관수' }
  if (clicks >= control * THRESHOLDS.brakeRatio) return { state: 'brake', clicks, control, label: '오늘은 감량 멈춤 · 한 계단 복귀' }
  return { state: 'continue', clicks, control, label: '계속 감량 가능' }
}

/**
 * 하루씩 진행한 기록을 만든다.
 * 멈춤 신호가 나오면 한 계단 복귀한 단계를 '멈춘 지점'으로 확정한다.
 * @param {number} days 진행한 일수 (0 = 시작 전)
 */
export function runDays(days) {
  const history = []
  let idx = 0
  let stoppedAt = null
  for (let d = 1; d <= days; d += 1) {
    if (stoppedAt !== null) {
      history.push({ day: d, level: stoppedAt, ...judge(stoppedAt), held: true })
      continue
    }
    const level = LEVELS[Math.min(idx, LEVELS.length - 1)]
    const j = judge(level)
    history.push({ day: d, level, ...j, held: false })
    if (j.state !== 'continue') {
      stoppedAt = LEVELS[Math.max(0, idx - 1)]
    } else if (idx < LEVELS.length - 1) {
      idx += 1
    }
  }
  return { history, stoppedAt }
}

/** 단계별 결과표 (발표 9쪽 비교용) */
export function outcomeTable() {
  return LEVELS.map((level) => ({
    level,
    brix: LEVEL_MODEL[level].brix,
    yieldPct: Math.round(LEVEL_MODEL[level].yield * 100),
    pricePct: Math.round((LEVEL_MODEL[level].price - 1) * 100),
    income: incomeAt(level),
    verdict: judge(level).state,
  }))
}
