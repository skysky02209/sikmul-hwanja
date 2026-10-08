import { useEffect, useMemo, useState } from 'react'
import { LEVELS, THRESHOLDS, CONTROL_CLICKS_PER_HOUR, runDays, outcomeTable, LEVEL_MODEL, incomeAt } from '../../domain/brakeSim.js'

const STATE_TEXT = {
  continue: { cls: 'st-ok', icon: '🟢' },
  brake: { cls: 'st-brake', icon: '🟠' },
  alarm: { cls: 'st-alarm', icon: '🔴' },
}
const MAX_DAYS = 10
const won = (n) => `${n.toLocaleString('ko-KR')}만 원`

/** 감량 구역 vs 대조 구역 일별 클릭 수 막대 그래프 */
function ClickChart({ history }) {
  const W = 340
  const H = 170
  const P = { l: 30, r: 8, t: 10, b: 26 }
  const days = Math.max(5, history.length)
  const max = 35
  const bw = (W - P.l - P.r) / days
  const y = (v) => P.t + (1 - Math.min(v, max) / max) * (H - P.t - P.b)
  const brakeClicks = Math.round(CONTROL_CLICKS_PER_HOUR * THRESHOLDS.brakeRatio * 10) / 10
  const brakeY = y(brakeClicks)
  const alarmY = y(THRESHOLDS.alarmClicks)
  const label = history.length
    ? history.map((h) => `${h.day}일차 ${h.level}% 감량구역 ${h.clicks}회, 대조 ${h.control}회`).join('; ')
    : '아직 진행한 날이 없습니다'
  return (
    <figure className="chart">
      <figcaption>
        <span className="chart-title">시간당 초음파 클릭 수 (감량 vs 대조)</span>
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
        {Array.from({ length: days }, (_, i) => {
          const h = history[i]
          const x0 = P.l + i * bw
          return (
            <g key={i}>
              {h && (
                <>
                  <rect x={x0 + bw * 0.18} y={y(h.clicks)} width={bw * 0.3} height={H - P.b - y(h.clicks)} className={`bar-${h.state}`} rx="2" />
                  <rect x={x0 + bw * 0.52} y={y(h.control)} width={bw * 0.3} height={H - P.b - y(h.control)} className="bar-control" rx="2" />
                </>
              )}
              <text x={x0 + bw / 2} y={H - 8} textAnchor="middle" className="axis">{i + 1}일</text>
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
  const [days, setDays] = useState(0)
  const { history, stoppedAt } = useMemo(() => runDays(days), [days])
  const today = history[history.length - 1]
  useEffect(() => {
    if (today && !today.held && today.state !== 'continue') onSignal?.(today.state, today)
  }, [history.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const table = useMemo(() => outcomeTable(), [])
  const currentLevel = stoppedAt ?? today?.level ?? 100
  const nextLevel = stoppedAt ?? LEVELS[Math.min(history.length, LEVELS.length - 1)]

  return (
    <section aria-labelledby="brake-title" className="panel">
      <h2 id="brake-title" className="panel-title">감량 관리</h2>
      <p className="hint">
        식물환자의 작동 원리대로 하루에 한 계단씩 관수를 줄이고, 물을 충분히 준 대조 구역과 식물의 초음파 클릭 수를 비교합니다.
        <strong> 모든 수치는 가정값이며 실제 측정이 아닙니다.</strong>
      </p>

      <article className="card" aria-labelledby="today-title">
        <div className="card-head">
          <h3 id="today-title">{history.length ? `${today.day}일차` : '시작 전'}</h3>
          <span className="chip chip-sim">테스트 데이터</span>
        </div>
        <ol className="steps" aria-label="감량 단계">
          {LEVELS.map((lv) => (
            <li key={lv} className={`step ${lv === currentLevel ? 'cur' : ''} ${stoppedAt === lv ? 'stop' : ''}`}>
              {lv}%
            </li>
          ))}
        </ol>
        <div key={days} className={`verdict pop ${today ? STATE_TEXT[today.state].cls : ''}`} role="status" aria-live="polite">
          {today ? (
            <>
              <span aria-hidden="true">{STATE_TEXT[today.state].icon} </span>
              <strong>{today.held ? `멈춘 지점 ${stoppedAt}% 유지 중` : today.label}</strong>
              <span className="verdict-sub">
                감량 구역 {today.clicks}회/시간 · 대조 구역 {today.control}회/시간 (멈춤 기준 {Math.round(CONTROL_CLICKS_PER_HOUR * THRESHOLDS.brakeRatio * 10) / 10}회 · 경보 기준 {THRESHOLDS.alarmClicks}회)
              </span>
            </>
          ) : (
            <strong>‘하루 진행’을 눌러 감량을 시작하세요.</strong>
          )}
        </div>
        {stoppedAt !== null && today && !today.held && (
          <p className="notice">📱 알림 예시: “오늘은 감량 멈춤 — 관수를 {stoppedAt}%로 한 계단 되돌리세요.”</p>
        )}
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setDays((d) => (d >= MAX_DAYS ? 0 : d + 1))}
          >
            {days >= MAX_DAYS
              ? `${MAX_DAYS}일 완료 — 처음부터 다시`
              : stoppedAt !== null
                ? `하루 진행 (${stoppedAt}% 유지 · ${days + 1}일차)`
                : `하루 진행 (${days + 1}일차 · 관수 ${nextLevel}%)`}
          </button>
          <button type="button" className="btn" onClick={() => setDays(0)} disabled={days === 0}>
            처음부터
          </button>
        </div>
      </article>

      <ClickChart history={history} />

      <article className="card" aria-labelledby="out-title">
        <div className="card-head">
          <h3 id="out-title">멈춘 지점별 예상 결과 (10a)</h3>
          <span className="chip chip-sim">가정값</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">관수 단계별 예상 당도, 수량, 단가, 10a 소득</caption>
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
                <tr key={r.level} className={stoppedAt === r.level ? 'row-on' : ''}>
                  <th scope="row">{r.level}%</th>
                  <td>{r.brix.toFixed(1)}°Bx</td>
                  <td>{r.yieldPct}%</td>
                  <td>{r.pricePct ? `+${r.pricePct}%` : '기준'}</td>
                  <td>{won(r.income)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {stoppedAt !== null ? (
          <p className="result">
            멈춘 지점 <strong>{stoppedAt}%</strong> → 예상 당도 <strong>{LEVEL_MODEL[stoppedAt].brix.toFixed(1)}°Bx</strong>, 10a 소득{' '}
            <strong>{won(incomeAt(stoppedAt))}</strong> (감량 안 할 때 대비 {incomeAt(stoppedAt) - incomeAt(100) >= 0 ? '+' : ''}
            {won(incomeAt(stoppedAt) - incomeAt(100))})
          </p>
        ) : (
          <p className="hint">선을 넘으면(70% 이하) 당도는 더 오르지만 수량이 크게 줄어 소득이 떨어집니다.</p>
        )}
        <p className="hint">근거: 식물환자 수익 시나리오 (기준 2,437만 원 · 적정선 3,042만 원 · 선을 넘음 2,387만 원). 수량·단가·당도는 가정값입니다.</p>
        <button
          type="button"
          className="btn btn-block"
          onClick={() => onApplyToSettings(currentLevel)}
        >
          현재 단계({currentLevel}%)를 테스트 설정에 반영 — 감량값 {Math.round(baseIrrigation * (1 - currentLevel / 100))} L/일 · 당도 {LEVEL_MODEL[currentLevel].brix.toFixed(1)}°Bx
        </button>
      </article>
    </section>
  )
}
