import { zoneStatus, AREA_PER_ZONE, THRESHOLDS } from '../../domain/sharedModel.js'

const CLS = { continue: 'st-ok', brake: 'st-brake', alarm: 'st-alarm' }

function ZoneCard({ z, selected, onSelect }) {
  const st = zoneStatus(z.level, z.factor)
  return (
    <button type="button" className={`zone-card ${CLS[st.state]} ${selected ? 'sel' : ''}`} aria-pressed={selected} onClick={() => onSelect?.(z.id)}>
      <div className="zone-top">
        <strong className="zone-name">{z.name}</strong>
        <span className="zone-area">약 {AREA_PER_ZONE}평</span>
        <span className={`zone-state ${CLS[st.state]}`}>{st.icon} {st.name}</span>
      </div>
      <div className="zone-tiles">
        <div><span>현재 관수 단계</span><b>{st.level}<small>%</small></b></div>
        <div><span>감량 구역</span><b>{st.clicks}<small>회/시간</small></b></div>
        <div><span>대조 구역</span><b>{st.control}<small>회/시간</small></b></div>
      </div>
      <p className="zone-todo">{st.instruction}</p>
    </button>
  )
}

/** 경보가 난 구역 바로 아래의 알림 칸 */
function AlarmMail({ zone, sent, onTrigger }) {
  const st = zoneStatus(zone.level, zone.factor)
  return (
    <div className="alarm-mail" aria-label="알림">
      <span className="zones-label">알림</span>
      <div className="card alarm-mail-card">
        <div className="alarm-mail-head">
          <strong>경보 메일</strong>
          <span className={`chip ${sent ? 'chip-sent' : 'chip-test'}`}>{sent ? '발송됨' : '알림 꺼짐'}</span>
        </div>
        <div className="alarm-mail-msg">
          <span className="alarm-ico" aria-hidden="true">✉️</span>
          <div>
            <b>{zone.name} 경보 — 즉시 관수</b>
            <small>감량 구역 {st.clicks}회/시간 (기준 {THRESHOLDS.alarmClicks}회)</small>
          </div>
        </div>
        <button type="button" className="btn btn-primary btn-block" onClick={onTrigger}>경보 상황 만들어 보기</button>
        <span className="chip chip-soon">출시 시 카톡 알림톡</span>
      </div>
    </div>
  )
}

/** 관수 구역별 상태 — 첫 화면에서 "지금 경보 상태"를 보여 준다. 경보가 있으면 경보 구역과 알림을 맨 위로 올린다 */
export default function ZoneCards({ zones, selectedId, onSelect, mailSent, onTrigger }) {
  const alarms = zones.filter((z) => zoneStatus(z.level, z.factor).state === 'alarm')
  const others = zones.filter((z) => zoneStatus(z.level, z.factor).state !== 'alarm')
  return (
    <section className="zones" aria-labelledby="zones-title">
      <h2 id="zones-title" className="zones-label">구역별 상태</h2>
      {alarms.length === 0 ? (
        <div className="zone-grid">
          {zones.map((z) => <ZoneCard key={z.id} z={z} selected={selectedId === z.id} onSelect={onSelect} />)}
        </div>
      ) : (
        <>
          <div className="zone-grid">
            {alarms.map((z) => <ZoneCard key={z.id} z={z} selected={selectedId === z.id} onSelect={onSelect} />)}
          </div>
          <AlarmMail zone={alarms[0]} sent={mailSent} onTrigger={onTrigger} />
          {others.length > 0 && (
            <div className="zone-rest">
              <span className="zones-label">나머지 구역</span>
              {others.map((z) => {
                const st = zoneStatus(z.level, z.factor)
                return (
                  <button key={z.id} type="button" className={`zone-row ${CLS[st.state]}`} onClick={() => onSelect?.(z.id)}>
                    <b>{z.name}</b>
                    <span>관수 {st.level}% · {st.clicks}회/시간</span>
                    <span className={`zone-state ${CLS[st.state]}`}>{st.icon} {st.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}
    </section>
  )
}
