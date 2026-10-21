import { LEVELS, THRESHOLDS, CONTROL_CLICKS_PER_HOUR, judgeLevel, zoneStatus, recommendedStop } from '../../domain/sharedModel.js'
import { SIM_HREF } from '../links.js'
import PlantSound from './PlantSound.jsx'

const CLS = { continue: 'st-ok', brake: 'st-brake', alarm: 'st-alarm' }
const BRAKE_CLICKS = Math.round(CONTROL_CLICKS_PER_HOUR * THRESHOLDS.brakeRatio * 10) / 10

/** 관수 단계별 감량 구역 vs 대조 구역 클릭 수 — 멈춤·경보 기준선은 점선 */
function ClickChart({ level, factor = 1, onPick }) {
  const W = 340
  const H = 180
  const P = { l: 30, r: 8, t: 12, b: 26 }
  const max = 35
  const bw = (W - P.l - P.r) / LEVELS.length
  const y = (v) => P.t + (1 - Math.min(v, max) / max) * (H - P.t - P.b)
  const brakeY = y(BRAKE_CLICKS)
  const alarmY = y(THRESHOLDS.alarmClicks)
  const label = LEVELS.map((lv) => `관수 ${lv}% 감량 구역 ${judgeLevel(lv, CONTROL_CLICKS_PER_HOUR, factor).clicks}회, 대조 ${CONTROL_CLICKS_PER_HOUR}회`).join('; ')
  return (
    <figure className="chart">
      <figcaption>
        <span className="chart-title">관수 단계별 시간당 초음파 클릭 수</span>
        <span className="chip chip-test">테스트값</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {[0, 15, 30].map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} className="gridline" />
            <text x={P.l - 5} y={y(t) + 4} textAnchor="end" className="axis">{t}</text>
          </g>
        ))}
        <line x1={P.l} x2={W - P.r} y1={brakeY} y2={brakeY} className="th th-brake dashed" />
        <line x1={P.l} x2={W - P.r} y1={alarmY} y2={alarmY} className="th th-alarm dashed" />
        <text x={W - P.r} y={alarmY - 4} textAnchor="end" className="axis th-label">경보 기준 {THRESHOLDS.alarmClicks}회</text>
        <text x={W - P.r} y={brakeY - 4} textAnchor="end" className="axis th-label">감량 멈춤 기준 {BRAKE_CLICKS}회</text>
        {LEVELS.map((lv, i) => {
          const j = judgeLevel(lv, CONTROL_CLICKS_PER_HOUR, factor)
          const x0 = P.l + i * bw
          const on = lv === level
          return (
            <g key={lv} onClick={() => onPick(lv)} style={{ cursor: 'pointer' }}>
              {on && <rect x={x0 + 2} y={P.t} width={bw - 4} height={H - P.b - P.t} rx="6" className="bar-pick" />}
              <rect x={x0 + bw * 0.18} y={y(j.clicks)} width={bw * 0.3} height={H - P.b - y(j.clicks)} className={`bar-${j.state}`} rx="2" opacity={on ? 1 : 0.55} />
              <rect x={x0 + bw * 0.52} y={y(j.control)} width={bw * 0.3} height={H - P.b - y(j.control)} className="bar-control" rx="2" />
              <text x={x0 + bw / 2} y={H - 8} textAnchor="middle" className="axis" fontWeight={on ? 800 : 400}>{lv}%</text>
            </g>
          )
        })}
      </svg>
      <ul className="legend">
        <li><span className="swatch" style={{ background: 'var(--c-green)' }} aria-hidden="true" />감량 구역</li>
        <li><span className="swatch" style={{ background: 'var(--c-muted)' }} aria-hidden="true" />대조 구역</li>
        <li><span className="swatch swatch-dash" aria-hidden="true" />기준선(점선)</li>
      </ul>
    </figure>
  )
}

/** 감량 관리 — 구역을 고르고 관수 단계를 눌러 "멈춤 판단"을 확인한다 */
export default function ReductionManager({ zones, selectedId, onSelectZone, onSetLevel }) {
  const zone = zones.find((z) => z.id === selectedId) ?? zones[0]
  const stopAt = recommendedStop()
  const st = zoneStatus(zone.level, zone.factor)
  const stepLevel = LEVELS.reduce((best, l) => (Math.abs(l - zone.level) < Math.abs(best - zone.level) ? l : best), LEVELS[0])

  return (
    <section aria-labelledby="brake-title" className="panel" id="sec-brake">
      <h2 id="brake-title" className="panel-title">감량 관리</h2>
      <p className="hint">구역을 고르고 관수 단계를 누르면, 그 단계에서 감량 구역 소리가 대조 구역과 어떻게 다른지 보고 멈출지 판단합니다.</p>

      <div className="zone-tabs" role="tablist" aria-label="구역 선택">
        {zones.map((z) => (
          <button key={z.id} type="button" role="tab" aria-selected={z.id === zone.id} className={`zone-tab ${z.id === zone.id ? 'on' : ''}`} onClick={() => onSelectZone(z.id)}>
            {z.name}
          </button>
        ))}
      </div>

      <article className="card">
        <ol className="steps" aria-label={`${zone.name} 관수 단계 — 눌러서 바꾸기`}>
          {LEVELS.map((lv) => {
            const s = judgeLevel(lv, CONTROL_CLICKS_PER_HOUR, zone.factor).state
            return (
              <li key={lv}>
                <button
                  type="button"
                  className={`step step-btn ${lv === stepLevel ? 'cur' : ''} ${stopAt === lv ? 'stop' : ''} step-${s}`}
                  aria-pressed={lv === stepLevel}
                  onClick={() => onSetLevel(zone.id, lv)}
                >
                  {lv}%
                  <span className="step-dot" aria-hidden="true">{judgeLevel(lv, CONTROL_CLICKS_PER_HOUR, zone.factor).icon}</span>
                </button>
              </li>
            )
          })}
        </ol>
        <p className="hint step-hint">🟢 정상 · 🟠 감량 멈춤 · 🔴 경보 · 노란 테두리 = 식물환자가 찾아 주는 멈출 지점({stopAt}%)</p>

        <div key={`${zone.id}-${zone.level}`} className={`verdict pop ${CLS[st.state]}`} role="status" aria-live="polite">
          <strong>{st.icon} {zone.name} · 관수 {st.level}% — {st.name}</strong>
          <span className="verdict-sub">
            감량 구역 {st.clicks}회/시간 · 대조 구역 {st.control}회/시간 (감량 멈춤 기준 {BRAKE_CLICKS}회 · 경보 기준 {THRESHOLDS.alarmClicks}회)
          </span>
          <span className="verdict-todo">📋 {st.instruction}</span>
        </div>
      </article>

      <ClickChart level={stepLevel} factor={zone.factor} onPick={(lv) => onSetLevel(zone.id, lv)} />
      <PlantSound clicks={st.clicks} state={st.state} />
      <p className="safety-note">🛡 출시 시 자동 관수 안전장치 · 감량 하한 60% · 센서 고장 시 100% 복귀 · 배지 수분 교차 확인 · 수동 조작 우선</p>
      <p className="hint">당도·수량·소득은 <a href={SIM_HREF}>당도 시뮬레이터</a>에서 따로 봅니다. 이 화면은 "멈춤 판단"까지만 보여 줍니다.</p>
    </section>
  )
}
