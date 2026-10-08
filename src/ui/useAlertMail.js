import { useCallback, useEffect, useRef, useState } from 'react'
import { ALERT_KIND, buildAlertMessage, formSubmitTransport, isValidEmail, shouldSend } from '../api/alertMailer.js'

const KEY = 'sikmul-hwanja.alertMail.v1'
const DEFAULTS = { email: '', enabled: false, includeBrake: true }

function load() {
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

/**
 * 경보 메일 설정과 발송.
 * notify(kind, details): 경보가 생겼을 때 호출 — 설정·쿨다운을 확인한 뒤 메일을 보낸다.
 */
export function useAlertMail({ onStatus } = {}) {
  const [prefs, setPrefs] = useState(load)
  const [log, setLog] = useState([])
  const [sending, setSending] = useState(false)
  const lastSent = useRef({})
  const send = useRef(formSubmitTransport())

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(prefs))
    } catch {
      /* 저장 불가 환경 */
    }
  }, [prefs])

  const update = useCallback((patch) => setPrefs((p) => ({ ...p, ...patch })), [])
  const emailOk = isValidEmail(prefs.email)

  const notify = useCallback(
    async (kind, details = {}) => {
      if (!emailOk) return null
      if (!shouldSend({ kind, enabled: prefs.enabled || kind === ALERT_KIND.TEST, includeBrake: prefs.includeBrake, lastSent: lastSent.current })) return null
      lastSent.current = { ...lastSent.current, [kind]: Date.now() }
      const msg = buildAlertMessage({ kind, details, appUrl: window.location.origin + window.location.pathname })
      setSending(true)
      let result
      try {
        result = await send.current({ to: prefs.email, ...msg })
      } catch {
        result = { ok: false, message: '인터넷 연결을 확인해 주세요. 메일을 보내지 못했습니다.' }
      }
      setSending(false)
      const entry = { at: new Date().toISOString(), kind, ok: result.ok, message: result.message, subject: msg.subject }
      setLog((l) => [entry, ...l].slice(0, 10))
      onStatus?.(result.message)
      return result
    },
    [emailOk, prefs.email, prefs.enabled, prefs.includeBrake, onStatus],
  )

  return { prefs, update, emailOk, notify, log, sending }
}
