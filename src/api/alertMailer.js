// 경보 메일 알림 — API 경계.
//
// 정적 사이트(GitHub Pages)라 자체 메일 서버가 없으므로, 비밀키가 필요 없는
// 외부 폼-메일 서비스 FormSubmit(https://formsubmit.co)의 AJAX 주소로 보낸다.
// ⚠ 받는 주소로 처음 보낼 때 FormSubmit이 '활성화 확인' 메일을 먼저 보내며,
//    받은 사람이 그 메일의 버튼을 한 번 눌러야 이후 경보 메일이 도착한다.
// 나중에 자체 서버(예: Supabase Edge Function)를 쓰려면 transport만 바꾸면 된다.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email.trim())
}

export const ALERT_KIND = Object.freeze({
  ALARM: 'alarm', // 급증 경보 — 즉시 관수 필요
  BRAKE: 'brake', // 감량 멈춤 신호
  TEST: 'test',
})

const KIND_LABEL = { alarm: '🔴 경보 — 즉시 관수 필요', brake: '🟠 감량 멈춤 신호', test: '🧪 테스트 메일' }

/** 메일 제목·본문 만들기 (순수 함수) */
export function buildAlertMessage({ kind, details = {}, appUrl, at = new Date() }) {
  const time = at.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
  const subject = `[식물환자] ${KIND_LABEL[kind] ?? kind}`
  const lines = [
    '식물환자 앱에서 보낸 알림입니다.',
    '',
    `${KIND_LABEL[kind] ?? kind}`,
    `시각: ${time}`,
    details.source && `발생 위치: ${details.source}`,
    details.deficit !== undefined && `관수 감량률: ${details.deficit}%`,
    details.level !== undefined && `관수 단계: ${details.level}%`,
    details.clicks !== undefined && `초음파 클릭 수: ${details.clicks}회/시간 (대조 구역 0.6회)`,
    details.brix !== undefined && `당도: ${details.brix}°Bx`,
    details.insideTemp !== undefined && `내부 온도·습도: ${details.insideTemp}℃ · ${details.insideHumidity}%`,
    kind === 'alarm' && '권장 조치: 바로 관수하고 감량 단계를 되돌리세요.',
    kind === 'brake' && '권장 조치: 오늘은 감량을 멈추고 한 계단 되돌리세요.',
    '',
    '※ 현재 테스트 모드입니다. 실제 센서가 아니라 앱에 입력한 테스트값으로 계산한 알림입니다.',
    appUrl && `앱 열기: ${appUrl}`,
  ].filter((x) => x !== false && x !== undefined && x !== null)
  return { subject, body: lines.join('\n') }
}

/** 같은 종류의 메일이 너무 자주 가지 않게 막는다 (기본 10분) */
export function shouldSend({ kind, enabled, includeBrake, lastSent = {}, now = Date.now(), cooldownMs = 10 * 60 * 1000 }) {
  if (!enabled) return false
  if (kind === ALERT_KIND.BRAKE && !includeBrake) return false
  if (kind === ALERT_KIND.TEST) return true
  const last = lastSent[kind] ?? 0
  return now - last >= cooldownMs
}

/** FormSubmit 전송기 */
export function formSubmitTransport(fetchImpl = globalThis.fetch) {
  return async function send({ to, subject, body }) {
    const res = await fetchImpl(`https://formsubmit.co/ajax/${encodeURIComponent(to.trim())}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ _subject: subject, _template: 'basic', _captcha: 'false', '식물환자 알림 내용': body }),
    })
    let data = {}
    try {
      data = await res.json()
    } catch {
      /* 응답이 JSON이 아닐 수 있음 */
    }
    const ok = res.ok && String(data.success) !== 'false'
    const needsActivation = /activat/i.test(String(data.message ?? ''))
    return {
      ok,
      needsActivation,
      message: needsActivation
        ? '받는 메일함에 FormSubmit 활성화 메일이 왔습니다. 메일 안의 버튼을 한 번 누르면 이후 경보 메일이 도착합니다.'
        : ok
          ? '메일을 보냈습니다.'
          : `메일을 보내지 못했습니다. (${data.message ?? res.status})`,
    }
  }
}

/** 메일 앱으로 직접 보내는 링크 (외부 서비스 없이) */
export function mailtoLink(to, { subject, body }) {
  return `mailto:${encodeURIComponent(to ?? '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/** Gmail 웹 메일쓰기 화면으로 바로 여는 링크 */
export function gmailComposeLink(to, { subject, body }) {
  const q = new URLSearchParams({ view: 'cm', fs: '1', to: to ?? '', su: subject, body })
  return `https://mail.google.com/mail/?${q.toString()}`
}
