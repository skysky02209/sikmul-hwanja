import { zoneStatus, STATE_NAME, AREA_PER_ZONE } from '../../domain/sharedModel.js'

const CLS = { continue: 'st-ok', brake: 'st-brake', alarm: 'st-alarm' }

/** 관수 구역별 상태 카드 — 첫 화면 맨 위에서 "지금 경보 상태"를 보여 준다 */
export default function ZoneCards({ zones, selectedId, onSelect }) {
  const worst = zones.reduce((w, z) => {
    const st = zoneStatus(z.level).state
    const rank = { continue: 0, brake: 1, alarm: 2 }
    return rank[st] > rank[w] ? st : w
  }, 'continue')
  return (
    <section className="zones" aria-labelledby="zones-title">
      <div className="zones-head">
        <h2 id="zones-title">구역별 상태</h2>
        <span className={`chip zone-sum ${CLS[worst]}`}>
          {zones.length}개 구역 · {worst === 'continue' ? '모두 정상' : `${STATE_NAME[worst]} 있음`}
        </span>
      </div>
      <div className="zone-grid">
        {zones.map((z) => {
          const st = zoneStatus(z.level)
          return (
            <button
              key={z.id}
              type="button"
              className={`zone-card ${CLS[st.state]} ${selectedId === z.id ? 'sel' : ''}`}
              aria-pressed={selectedId === z.id}
              onClick={() => onSelect?.(z.id)}
            >
              <div className="zone-top">
                <strong className="zone-name">{z.name}</strong>
                <span className="zone-area">약 {AREA_PER_ZONE}평</span>
                <span className={`zone-state ${CLS[st.state]}`}>{st.icon} {st.name}</span>
              </div>
              <div className="zone-mid">
                <div>
                  <span className="lbl">관수 단계</span>
                  <b className="zone-level">{st.level}%</b>
                </div>
                <div>
                  <span className="lbl">감량 구역 vs 대조 구역</span>
                  <b>{st.clicks}회 <small>vs</small> {st.control}회</b>
                  <span className="lbl">/시간 · 테스트값</span>
                </div>
              </div>
              <p className="zone-todo">{st.instruction}</p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
