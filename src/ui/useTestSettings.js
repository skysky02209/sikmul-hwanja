import { useCallback, useMemo, useState } from 'react'
import { DEFAULT_SETTINGS, SETTING_KEYS } from '../domain/model.js'
import { validateField } from '../domain/validate.js'
import { loadSettings, saveSettings, clearSettings } from '../storage/settingsStore.js'

const toDraft = (s) => Object.fromEntries(SETTING_KEYS.map((k) => [k, typeof s[k] === 'number' ? String(s[k]) : s[k]]))

/**
 * 테스트 설정 상태.
 * - draft: 폼에 입력 중인 원본 문자열
 * - preview: 검증을 통과한 값만 반영된 미리보기 (대시보드가 즉시 사용)
 * - saved: 브라우저에 저장된 값
 */
export function useTestSettings() {
  const initial = useMemo(() => loadSettings(), [])
  const [saved, setSaved] = useState(initial ?? { ...DEFAULT_SETTINGS })
  const [hasSaved, setHasSaved] = useState(Boolean(initial))
  const [draft, setDraft] = useState(() => toDraft(initial ?? DEFAULT_SETTINGS))
  const [preview, setPreview] = useState(initial ?? { ...DEFAULT_SETTINGS })
  const [errors, setErrors] = useState({})

  const update = useCallback((key, raw) => {
    setDraft((d) => ({ ...d, [key]: raw }))
    const res = validateField(key, raw)
    setErrors((e) => {
      const next = { ...e }
      if (res.ok) delete next[key]
      else next[key] = res.error
      return next
    })
    if (res.ok) setPreview((p) => ({ ...p, [key]: res.value }))
  }, [])

  const hasErrors = Object.keys(errors).length > 0
  const dirty = hasErrors || SETTING_KEYS.some((k) => preview[k] !== saved[k])

  const save = useCallback(() => {
    if (hasErrors) return { ok: false, message: '잘못 입력된 항목이 있어 저장하지 않았습니다.' }
    const ok = saveSettings(preview)
    if (!ok) return { ok: false, message: '이 브라우저에서는 저장할 수 없습니다. (저장소 사용 불가)' }
    setSaved({ ...preview })
    setHasSaved(true)
    return { ok: true, message: '테스트값을 이 브라우저에 저장했습니다.' }
  }, [hasErrors, preview])

  const reset = useCallback(() => {
    clearSettings()
    setDraft(toDraft(DEFAULT_SETTINGS))
    setPreview({ ...DEFAULT_SETTINGS })
    setSaved({ ...DEFAULT_SETTINGS })
    setErrors({})
    setHasSaved(false)
    return { ok: true, message: '기본 테스트값으로 초기화하고 저장된 값을 지웠습니다.' }
  }, [])

  const revert = useCallback(() => {
    setDraft(toDraft(saved))
    setPreview({ ...saved })
    setErrors({})
    return { ok: true, message: '마지막으로 저장한 값으로 되돌렸습니다.' }
  }, [saved])

  return { draft, preview, saved, errors, hasErrors, dirty, hasSaved, update, save, reset, revert }
}
