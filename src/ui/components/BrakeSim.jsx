import { useMemo, useState } from 'react'
import { LEVELS, THRESHOLDS, CONTROL_CLICKS_PER_HOUR, outcomeTable, LEVEL_MODEL, incomeAt, judge } from '../../domain/brakeSim.js'

const STATE_TEXT = {
  continue: { cls: 'st-ok', icon: '🟢' },
  brake: { cls: 'st-brake', icon: '🟠' },
  alarm: { cls: 'st-alarm', icon: '🔴' },
}
const won = (n) => `${n.toLocaleString('ko-KR')}만 원`
const BRAKE_CLICKS = Math.round(CONTROL_CLICKS_PER_HOUR * THRESHOLDS.brakeRatio * 10) / 10

/** 소리가 처음 늘어나는 단계 바로 위 = 멈출 지점 (예: 70%에서 소리↑ → 80%) */
function recommendedStop() {
  const i = LEVELS.findIndex((lv) => judge(lv).state !== 'continue')
  return i <= 0 ? LEVELS[0] : LEVELS[i - 1]
}

/** 관수 단계별 감량 구역 vs 대조 구역 클릭 수 막대 그래프 — 막대를 눌러도 단계가 선택된다 */
function ClickChart({ level, onPick }) {
  const W = 340
  const H = 170
  const P = { l: 30, r: 8, t: 10, b: 26 }
  const max = 35
  const bw = (W - P.l - P.r) / LEVELS.length
  const y = (v) => P.t + (1 - Math.min(v, max) / max) * (H - P.t - P.b)
  const brakeY = y(BRAKE_CLICKS)
  const alarmY = y(THRESHOLDS.alarmClicks)
  const label = LEVELS.map((lv) => `관수 ${lv}% 감량구역 ${judge(lv).clicks}회, 대조 ${CONTROL_CLICKS_PER_HOUR}회`).join('; ')
  return (
    <figure className="chart">
      <figcaption>
        <span className="chart-title">관수 단계별 시간당 초음파 클릭 수 (감량 vs 대조)</span>
        <span className="chip chip-sim">테스트 데이터</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {[0, 15, 30].map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} className="gridline" />
            <text x={P.l - 5} y={y(t) + 4} textAnchor="end" className="axis">{t}</text>
          </g>
        ))}
        <line x1={P.l} x2={W - P.r} y1={brakeY} y2={brakeY} className="th th-brake" />
        <line x1={P.l} x2={W - P.r} y1={alarmY} y2={alarmY} className="th th-alarm" />
        <text x={W - P.r} y={alarmY - 4} textAnchor="end" className="axis th-label">경보 기준</text>
        <text x={W - P.r} y={brakeY - 4} textAnchor="end" className="axis th-label">멈춤 기준</text>
        {LEVELS.map((lv, i) => {
          const j = judge(lv)
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
      </ul>
    </figure>
  )
}

export default function BrakeSim({ baseIrrigation, onApplyToSettings, onSignal }) {
  const [level, setLevel] = useState(100)
  const table = useMemo(() => outcomeTable(), [])
  const stopAt = useMemo(() => recommendedStop(), [])
  const j = judge(level)
  const m = LEVEL_MODEL[level]
  const diff = incomeAt(level) - incomeAt(100)

  const pick = (lv) => {
    if (lv === level) return
    setLevel(lv)
    const s = judge(lv)
    if (s.state !== 'continue') onSignal?.(s.state, { level: lv, clicks: s.clicks })
  }

  return (
    <section aria-labelledby="brake-title" className="panel">
      <h2 id="brake-title" className="panel-title">감량 관리</h2>
      <p className="hint">
        관수 단계를 눌러 보세요. 그 관수량에서 식물의 초음파 클릭 수가 물을 충분히 준 대조 구역과 어떻게 다른지, 그리고 당도·수량·소득이 어떻게 되는지 바로 보여 줍니다.
        <strong> 모든 수치는 가정값이며 실제 측정이 아닙니다.</strong>
      </p>

      <article className="card" aria-labelledby="today-title">
        <div className="card-head">
          <h3 id="today-title">관수 단계 선택</h3>
          <span className="chip chip-sim">테스트 데이터</span>
        </div>
        <ol className="steps" aria-label="관수 단계 — 눌러서 결과 보기">
          {LEVELS.map((lv) => {
            const st = judge(lv).state
            return (
              <li key={lv}>
                <button
                  type="button"
                  className={`step step-btn ${lv === level ? 'cur' : ''} ${stopAt === lv ? 'stop' : ''} step-${st}`}
                  aria-pressed={lv === level}
                  onClick={() => pick(lv)}
                >
                  {lv}%
                  <span className="step-dot" aria-hidden="true">{STATE_TEXT[st].icon}</span>
                </button>
              </li>
            )
          })}
        </ol>
        <p className="hint step-hint">🟢 계속 감량 가능 · 🟠 감량 멈춤 · 🔴 경보 · 노란 테두리 = 식물환자가 찾아 주는 멈출 지점({stopAt}%)</p>

        <div key={level} className={`verdict pop ${STATE_TEXT[j.state].cls}`} role="status" aria-live="polite">
          <span aria-hidden="true">{STATE_TEXT[j.state].icon} </span>
          <strong>관수 {level}% — {j.label}</strong>
          <span className="verdict-sub">
            감량 구역 {j.clicks}회/시간 · 대조 구역 {j.control}회/시간 (멈춤 기준 {BRAKE_CLICKS}회 · 경보 기준 {THRESHOLDS.alarmClicks}회)
          </span>
        </div>

        <dl className="level-grid">
          <div><dt>예상 당도</dt><dd>{m.brix.toFixed(1)}°Bx</dd></div>
          <div><dt>예상 수량</dt><dd>{Math.round(m.yield * 100)}%</dd></div>
          <div><dt>단가</dt><dd>{m.price > 1 ? `+${Math.round((m.price - 1) * 100)}%` : '기준'}</dd></div>
          <div className="wide"><dt>10a 소득</dt><dd>{won(incomeAt(level))} <small>(감량 안 할 때 대비 {diff >= 0 ? '+' : ''}{won(diff)})</small></dd></div>
        </dl>

        <p className={`notice ${j.state === 'alarm' ? 'why-alarm' : ''}`}>
          {j.state === 'continue'
            ? level === stopAt
              ? `✅ 여기가 멈출 지점입니다. 한 계단 더 줄이면(${LEVELS[LEVELS.indexOf(level) + 1]}%) 소리가 늘어납니다.`
              : '소리가 대조 구역과 비슷합니다 → 내일 한 계단 더 줄여도 됩니다.'
            : j.state === 'brake'
              ? `📱 알림: “오늘은 감량 멈춤 — 관수를 ${stopAt}%로 한 계단 되돌리세요.” (소리가 대조 구역의 ${THRESHOLDS.brakeRatio}배 이상)`
              : `📱 경보: “즉시 관수하세요.” 소리가 경보 기준 ${THRESHOLDS.alarmClicks}회를 넘었습니다. 당도는 조금 더 오르지만 수량이 크게 줄어듭니다.`}
        </p>
      </article>

      <ClickChart level={level} onPick={pick} />

      <article className="card" aria-labelledby="out-title">
        <div className="card-head">
          <h3 id="out-title">단계별 예상 결과 (10a)</h3>
          <span className="chip chip-sim">가정값</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">관수 단계별 예상 당도, 수량, 단가, 10a 소득 — 행을 누르면 그 단계가 선택됩니다</caption>
            <thead>
              <tr>
                <th scope="col">관수</th>
                <th scope="col">당도</th>
                <th scope="col">수량</th>
                <th scope="col">단가</th>
                <th scope="col">10a 소득</th>
              </tr>
            </thead>
            <tbody>
              {table.map((r) => (
                <tr key={r.level} className={`row-click ${stopAt === r.level ? 'row-on' : ''} ${level === r.level ? 'row-picked' : ''}`} onClick={() => pick(r.level)}>
                  <th scope="row">{STATE_TEXT[r.verdict].icon} {r.level}%</th>
                  <td>{r.brix.toFixed(1)}°Bx</td>
                  <td>{r.yieldPct}%</td>
                  <td>{r.pricePct ? `+${r.pricePct}%` : '기준'}</td>
                  <td>{won(r.income)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="result">
          식물환자가 찾는 멈출 지점 <strong>{stopAt}%</strong> → 예상 당도 <strong>{LEVEL_MODEL[stopAt].brix.toFixed(1)}°Bx</strong>, 10a 소득{' '}
          <strong>{won(incomeAt(stopAt))}</strong> (감량 안 할 때 대비 +{won(incomeAt(stopAt) - incomeAt(100))})
        </p>
        <p className="hint">근거: 식물환자 수익 시나리오 (기준 2,437만 원 · 적정선 3,042만 원 · 선을 넘음 2,387만 원). 수량·단가·당도는 가정값입니다.</p>
        <button type="button" className="btn btn-block" onClick={() => onApplyToSettings(level)}>
          관수 {level}%를 테스트 설정에 반영 — 감량값 {Math.round(baseIrrigation * (1 - level / 100))} L/일 · 당도 {LEVEL_MODEL[level].brix.toFixed(1)}°Bx
        </button>
      </article>
    </section>
  )
}
