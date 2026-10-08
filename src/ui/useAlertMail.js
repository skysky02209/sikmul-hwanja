import { useCallback, useEffect, useRef, useState } from 'react'
import { ALERT_KIND, buildAlertMessage, cooldownLeft, formSubmitTransport, isValidEmail, shouldSend } from '../api/alertMailer.js'

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
  const [lastResult, setLastResult] = useState(null)
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
      const name = kind === ALERT_KIND.ALARM ? '경보' : kind === ALERT_KIND.BRAKE ? '멈춤 신호' : '테스트'
      if (!emailOk || !(prefs.enabled || kind === ALERT_KIND.TEST)) {
        if (kind !== ALERT_KIND.TEST) onStatus?.(`${name}가 떴지만 메일 알림이 꺼져 있어 보내지 않았습니다. 테스트 설정 아래에서 메일 주소를 넣고 알림을 켜 주세요.`)
        return null
      }
      if (!shouldSend({ kind, enabled: true, includeBrake: prefs.includeBrake, lastSent: lastSent.current })) {
        const left = Math.ceil(cooldownLeft({ kind, lastSent: lastSent.current }) / 1000)
        if (left > 0) onStatus?.(`${name} 메일을 방금 보냈습니다. 같은 메일은 1분에 한 번만 보냅니다 — ${left}초 뒤 다시 시험해 주세요.`)
        return null
      }
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
      setLastResult(result)
      onStatus?.(result.ok ? `${name} 메일을 보냈습니다. Gmail 받은편지함을 확인해 주세요. (${msg.subject})` : result.message)
      return result
    },
    [emailOk, prefs.email, prefs.enabled, prefs.includeBrake, onStatus],
  )

  return { prefs, update, emailOk, notify, log, sending, lastResult }
}
