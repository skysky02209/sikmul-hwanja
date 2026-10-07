import { NUMERIC_FIELDS, PERIODS, WEATHERS, DEFAULT_SETTINGS } from './model.js'

/**
 * 한 필드 값을 검증한다. 문자열 입력(폼)도 받는다.
 * @returns {{ ok: true, value: any } | { ok: false, error: string }}
 */
export function validateField(key, raw) {
  if (key === 'period') {
    return PERIODS.some((p) => p.value === raw) ? { ok: true, value: raw } : { ok: false, error: '낮 또는 밤을 선택해 주세요.' }
  }
  if (key === 'weather') {
    return WEATHERS.some((w) => w.value === raw) ? { ok: true, value: raw } : { ok: false, error: '날씨를 선택해 주세요.' }
  }
  const spec = NUMERIC_FIELDS[key]
  if (!spec) return { ok: false, error: '알 수 없는 항목입니다.' }
  if (raw === '' || raw === null || raw === undefined) {
    return { ok: false, error: `${spec.label}을(를) 입력해 주세요.` }
  }
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim())
  if (!Number.isFinite(n)) return { ok: false, error: '숫자만 입력할 수 있습니다.' }
  if (n < spec.min || n > spec.max) {
    return { ok: false, error: `${spec.min}~${spec.max}${spec.unit} 사이로 입력해 주세요.` }
  }
  return { ok: true, value: n }
}

/** 설정 전체 검증. 저장된 값 복원 시에도 사용 */
export function validateSettings(input) {
  const values = {}
  const errors = {}
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const res = validateField(key, input?.[key])
    if (res.ok) values[key] = res.value
    else errors[key] = res.error
  }
  return { values, errors, ok: Object.keys(errors).length === 0 }
}

/** 잘못된 항목은 기본값으로 채운 안전한 설정을 돌려준다 */
export function sanitizeSettings(input) {
  const { values } = validateSettings(input)
  return { ...DEFAULT_SETTINGS, ...values }
}
