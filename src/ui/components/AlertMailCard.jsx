import { ALERT_KIND, buildAlertMessage, mailtoLink } from '../../api/alertMailer.js'

const KIND_TEXT = { alarm: '경보', brake: '멈춤 신호', test: '테스트' }

export default function AlertMailCard({ mail }) {
  const { prefs, update, emailOk, notify, log, sending } = mail
  const sample = buildAlertMessage({ kind: ALERT_KIND.ALARM, details: { source: '메일 앱으로 보내기' }, appUrl: typeof window !== 'undefined' ? window.location.href : '' })
  return (
    <section className="group alert-mail" aria-labelledby="mail-title">
      <h3 id="mail-title" className="mail-title">📧 경보 메일 알림</h3>
      <p className="hint">
        식물환자 판정이 <strong>경보</strong>(또는 감량 멈춤)로 바뀌면 입력한 주소로 메일을 보냅니다. 같은 종류의 메일은 10분에 한 번만 보냅니다.
      </p>
      <div className="field">
        <label htmlFor="mail-to">받을 메일 주소</label>
        <input
          id="mail-to"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="name@example.com"
          value={prefs.email}
          aria-invalid={prefs.email !== '' && !emailOk}
          aria-describedby="mail-err"
          onChange={(e) => update({ email: e.target.value })}
        />
        {prefs.email !== '' && !emailOk && (
          <p id="mail-err" className="error" role="alert">메일 주소 형식을 확인해 주세요.</p>
        )}
      </div>
      <label className="inline check">
        <input type="checkbox" checked={prefs.enabled} disabled={!emailOk} onChange={(e) => update({ enabled: e.target.checked })} />
        <span>경보가 뜨면 메일 받기</span>
      </label>
      <label className="inline check">
        <input type="checkbox" checked={prefs.includeBrake} onChange={(e) => update({ includeBrake: e.target.checked })} />
        <span>감량 멈춤 신호도 받기</span>
      </label>
      <div className="btn-row">
        <button type="button" className="btn" disabled={!emailOk || sending} onClick={() => notify(ALERT_KIND.TEST, { source: '테스트 메일 버튼' })}>
          {sending ? '보내는 중…' : '테스트 메일 보내기'}
        </button>
        <a className="btn btn-ghost" href={mailtoLink(prefs.email, sample)}>메일 앱으로 열기</a>
      </div>
      <p className="hint">
        처음 한 번은 받는 메일함에 <strong>FormSubmit 활성화 메일</strong>이 옵니다. 메일 안의 버튼을 누르면 그다음부터 경보 메일이 도착합니다.
        메일은 외부 서비스(FormSubmit)를 거쳐 전달되며, 주소는 이 브라우저에만 저장됩니다.
      </p>
      {log.length > 0 && (
        <ol className="log" aria-label="최근 메일 기록">
          {log.map((l) => (
            <li key={l.at}>
              {new Date(l.at).toLocaleTimeString('ko-KR')} · {KIND_TEXT[l.kind]} · {l.ok ? '전송됨' : '실패'} — {l.message}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
