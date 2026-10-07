import { DEFAULT_SETTINGS } from '../domain/model.js'
import { sanitizeSettings } from '../domain/validate.js'

export const STORAGE_KEY = 'sikmul-hwanja.testSettings.v1'

function storage(override) {
  if (override) return override
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

/** 저장된 테스트값을 불러온다. 없거나 손상되면 null */
export function loadSettings(store) {
  try {
    const s = storage(store)
    const raw = s?.getItem(STORAGE_KEY)
    if (!raw) return null
    return sanitizeSettings(JSON.parse(raw))
  } catch {
    return null
  }
}

/** @returns {boolean} 저장 성공 여부 */
export function saveSettings(settings, store) {
  try {
    const s = storage(store)
    if (!s) return false
    s.setItem(STORAGE_KEY, JSON.stringify(sanitizeSettings(settings)))
    return true
  } catch {
    return false
  }
}

export function clearSettings(store) {
  try {
    storage(store)?.removeItem(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

export function defaults() {
  return { ...DEFAULT_SETTINGS }
}
