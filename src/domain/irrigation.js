// 관수량 계산 — 순수 함수 (화면·장치와 무관하게 테스트 가능)

/**
 * 기본 관수량에서 감량값을 뺀 최종 관수량. 0보다 작아지지 않는다.
 * @param {number} base 기본 관수량
 * @param {number} reduction 감량값
 */
export function computeFinalIrrigation(base, reduction) {
  const b = Number.isFinite(base) ? base : 0
  const r = Number.isFinite(reduction) ? reduction : 0
  const final = Math.max(0, b - r)
  return Math.round(final * 10) / 10
}

/** 실제로 적용되는 감량 비율(%) — 기본값이 0이면 0 */
export function reductionRate(base, reduction) {
  if (!Number.isFinite(base) || base <= 0) return 0
  const applied = Math.min(Math.max(0, reduction || 0), base)
  return Math.round((applied / base) * 1000) / 10
}

/** 감량값이 기본 관수량보다 커서 0으로 잘렸는지 */
export function isClamped(base, reduction) {
  return Number.isFinite(base) && Number.isFinite(reduction) && reduction > base
}
