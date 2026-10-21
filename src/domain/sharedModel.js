// 식물환자 공통 계산 모듈 — 경보 앱(index.html)과 당도 시뮬레이터(simulator.html)가 함께 쓴다.
// 관수 단계별 클릭 수 판정 · 당도/수량/소득 모델 · 설치 계산을 한곳에서 내보낸다.
// ⚠ 모든 수치는 가정·예시이며 실제 측정값이 아니다.

export {
  LEVELS, LEVEL_MODEL, CONTROL_CLICKS_PER_HOUR, THRESHOLDS, INCOME_MODEL, incomeAt, judge, outcomeTable, runDays,
} from './brakeSim.js'
export {
  BASE_BRIX, BRIX_FLOOR, DAILY_MAX_CHANGE, evaluateConditions, stepBrix, clicksForWater, plantSignal, deficitPct, hoursToReach, yieldIndex,
} from './brixModel.js'

import { LEVELS, THRESHOLDS, CONTROL_CLICKS_PER_HOUR } from './brakeSim.js'
import { clicksForWater } from './brixModel.js'

/** 상태 이름 (화면 전체에서 같은 말을 쓴다) */
export const STATE_NAME = Object.freeze({ continue: '정상', brake: '감량 멈춤', alarm: '경보' })
export const STATE_ICON = Object.freeze({ continue: '🟢', brake: '🟠', alarm: '🔴' })

/** 구역마다 소리 크기가 조금씩 다르다 (테스트값) */
export const ZONE_FACTORS = Object.freeze([1, 1, 0.95, 1, 1.05, 1])

/** 관수 구역 1곳의 넓이(평) — 감량 마이크 1대가 맡는 범위 (가정) */
export const AREA_PER_ZONE = 300
/** 감량 마이크 1대당 월 이용료(만 원, 가정) */
export const FEE_PER_MIC = 5

/** 소리가 처음 늘어나는 단계 바로 위 = 멈출 지점 (예: 70%에서 소리↑ → 80%) */
export function recommendedStop() {
  const i = LEVELS.findIndex((lv) => judgeLevel(lv).state !== 'continue')
  return i <= 0 ? LEVELS[0] : LEVELS[i - 1]
}

/** 관수 단계(%)의 판정 — 단계 사이 값도 클릭 수를 보간해 판정한다 */
export function judgeLevel(level, control = CONTROL_CLICKS_PER_HOUR, factor = 1) {
  const clicks = Math.round(clicksForWater(level) * factor * 10) / 10
  const state = clicks >= THRESHOLDS.alarmClicks ? 'alarm' : clicks >= control * THRESHOLDS.brakeRatio ? 'brake' : 'continue'
  return { state, clicks, control, name: STATE_NAME[state], icon: STATE_ICON[state] }
}

/** 구역 카드에 쓰는 상태 + 오늘의 지시 문장 */
export function zoneStatus(level, factor = 1) {
  const j = judgeLevel(level, CONTROL_CLICKS_PER_HOUR, factor)
  const lv = Math.round(level)
  let instruction
  if (j.state === 'continue') {
    const next = LEVELS.find((l) => l < lv)
    instruction = next ? '오늘은 그대로 — 내일 한 계단 더 줄여도 됩니다' : '오늘은 그대로 — 지금 단계 유지'
  } else if (j.state === 'brake') {
    const back = [...LEVELS].reverse().find((l) => l > lv) ?? LEVELS[0]
    instruction = `오늘은 감량 멈춤 — ${back}%로 한 계단 복귀`
  } else {
    instruction = `지금 즉시 관수 — ${LEVELS[0]}%로 되돌리세요`
  }
  return { ...j, level: lv, instruction }
}

/**
 * 설치 계산 (가정)
 * 감량 마이크 = 올림(면적 ÷ 300)대, 대조 마이크 = 농가당 1대, 월 이용료 = 감량 마이크 수 × 5만 원
 */
export function installPlan(area) {
  const a = Number(area)
  if (!Number.isFinite(a) || a <= 0) return null
  const reductionMics = Math.ceil(a / AREA_PER_ZONE)
  return { area: a, zones: reductionMics, reductionMics, controlMics: 1, monthlyFee: reductionMics * FEE_PER_MIC }
}
