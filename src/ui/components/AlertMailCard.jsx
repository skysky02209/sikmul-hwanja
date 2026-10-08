import { ALERT_KIND, buildAlertMessage, gmailComposeLink } from '../../api/alertMailer.js'

const KIND_TEXT = { alarm: '경보', brake: '멈춤 신호', test: '테스트' }

export default function AlertMailCard({ mail, onTriggerAlarm }) {
  const { prefs, update, emailOk, notify, log, sending, lastResult } = mail
  const sample = buildAlertMessage({ kind: ALERT_KIND.ALARM, details: { source: 'Gmail로 직접 보내기' }, appUrl: typeof window !== 'undefined' ? window.location.href : '' })

  const turnOnAndTest = (e) => {
    e.preventDefault()
    if (!emailOk) return
    update({ enabled: true })
    notify(ALERT_KIND.TEST, { source: '알림 켜기 · 테스트 메일' })
  }

  return (
    <section className="group alert-mail" aria-labelledby="mail-title">
      <h3 id="mail-title" className="mail-title">📧 경보 메일 알림</h3>
      <p className="hint">
        식물환자 판정이 <strong>경보</strong>(또는 감량 멈춤)로 바뀌면 입력한 주소로 메일을 보냅니다. 경보 중에 관수 값을 다시 바꿔도 다시 보냅니다. 같은 종류의 메일은 1분에 한 번만 보냅니다.
      </p>
      <form className="mail-form" onSubmit={turnOnAndTest} noValidate>
        <div className="field">
          <label htmlFor="mail-to">받을 메일 주소</label>
          <input
            id="mail-to"
            type="email"
            inputMode="email"
            autoComplete="email"
            enterKeyHint="send"
            placeholder="name@example.com"
            value={prefs.email}
            aria-invalid={prefs.email !== '' && !emailOk}
            aria-describedby="mail-err"
            onChange={(e) => update({ email: e.target.value.trim() })}
          />
          {prefs.email !== '' && !emailOk && (
            <p id="mail-err" className="error" role="alert">메일 주소 형식을 확인해 주세요. (예: name@example.com)</p>
          )}
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={!emailOk || sending}>
          {sending ? '보내는 중…' : prefs.enabled ? '테스트 메일 다시 받기' : '알림 켜고 테스트 메일 받기'}
        </button>
      </form>

      <label className="inline check">
        <input type="checkbox" checked={prefs.enabled} disabled={!emailOk} onChange={(e) => update({ enabled: e.target.checked })} />
        <span>경보가 뜨면 메일 받기 {prefs.enabled ? '(켜짐)' : '(꺼짐)'}</span>
      </label>
      <label className="inline check">
        <input type="checkbox" checked={prefs.includeBrake} onChange={(e) => update({ includeBrake: e.target.checked })} />
        <span>감량 멈춤 신호도 받기</span>
      </label>

      <div className="btn-row">
        <button type="button" className="btn btn-danger" disabled={!emailOk || !prefs.enabled || sending} onClick={onTriggerAlarm}>
          🔴 경보 상황 만들어 보기
        </button>
        <a className="btn btn-ghost" href={gmailComposeLink(prefs.email, sample)} target="_blank" rel="noopener noreferrer">Gmail로 열기</a>
      </div>
      <p className="hint">‘경보 상황 만들어 보기’를 누르면 관수 감량을 40%로 바꿔 실제로 경보를 띄우고, 경보 메일을 보냅니다. (테스트 설정에서 원래 값으로 되돌릴 수 있습니다)</p>

      {lastResult?.needsActivation && (
        <div className="notice activation" role="status">
          <strong>처음 한 번만 메일 인증이 필요합니다</strong>
          <ol>
            <li>메일함에서 <b>“Action Required: Activate FormSubmit”</b> 메일을 엽니다. (스팸함도 확인)</li>
            <li>메일 안의 <b>“Activate Form”</b> 버튼을 누릅니다. 영어 화면이 뜨면 인증이 끝난 것입니다.</li>
            <li>그 창을 닫고 이 앱으로 돌아와 <b>‘테스트 메일 다시 받기’</b>를 누르면 메일이 바로 도착합니다.</li>
          </ol>
        </div>
      )}

      <p className="hint">
        메일은 무료 메일 전송 서비스(FormSubmit)를 거쳐 전달됩니다. 이 서비스의 인증 화면과 메일 첫 줄 안내문은 영어로만 나오며, 알림 내용은 한국어로 보냅니다. 주소는 이 브라우저에만 저장됩니다.
      </p>
      {log.length > 0 && (
        <ol className="log" aria-label="최근 메일 기록">
          {log.map((l) => (
            <li key={l.at}>
              {new Date(l.at).toLocaleTimeString('ko-KR')} · {KIND_TEXT[l.kind]} · {l.ok ? '전송됨' : l.message.includes('활성화') ? '인증 필요' : '실패'} — {l.message}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
