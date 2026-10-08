import { SPEEDS, formatElapsed } from '../useCropSim.js'
import { BASE_BRIX } from '../../domain/brixModel.js'

const TONE_ICON = { good: '▲', bad: '▼', warn: '▽', neutral: '•' }
const SIGNAL_CLS = { continue: 'st-ok', brake: 'st-brake', alarm: 'st-alarm' }

function BrixLine({ history, maxHours, target }) {
  const W = 320
  const H = 120
  const P = { l: 28, r: 8, t: 10, b: 20 }
  const span = Math.max(48, history[history.length - 1]?.h ?? 0)
  const lo = 3
  const hi = 12
  const x = (h) => P.l + (h / span) * (W - P.l - P.r)
  const y = (b) => P.t + (1 - (b - lo) / (hi - lo)) * (H - P.t - P.b)
  const pts = history.map((p) => `${x(p.h)},${y(p.b)}`).join(' ')
  const days = Math.ceil(span / 24)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`당도 변화 그래프: ${history[0].b.toFixed(1)}°Bx에서 ${history[history.length - 1].b.toFixed(1)}°Bx, 목표 ${target}°Bx`}>
      {[4, 6, 8, 10, 12].map((t) => (
        <g key={t}>
          <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} className="gridline" />
          <text x={P.l - 5} y={y(t) + 3} textAnchor="end" className="axis">{t}</text>
        </g>
      ))}
      {Array.from({ length: days + 1 }, (_, d) => (
        <text key={d} x={x(d * 24)} y={H - 5} textAnchor="middle" className="axis">{d}일</text>
      ))}
      <line x1={P.l} x2={W - P.r} y1={y(target)} y2={y(target)} className="th th-target" />
      <polyline points={pts} fill="none" stroke="var(--c-green)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {history.length > 0 && <circle cx={x(history[history.length - 1].h)} cy={y(history[history.length - 1].b)} r="4.5" fill="var(--c-green)" />}
    </svg>
  )
}

export default function GrowthSimCard({ sim, baseBrixInput }) {
  const { conditions, running, hours, brix, startBrix, history } = sim
  const delta = Math.round((brix - startBrix) * 10) / 10
  const trend = conditions.target > brix + 0.05 ? 'up' : conditions.target < brix - 0.05 ? 'down' : 'flat'
  return (
    <article className="card sim-card" aria-labelledby="sim-title">
      <div className="card-head">
        <h3 id="sim-title">생육 예측 · 당도 변화</h3>
        <span className="chip chip-sim">예측</span>
      </div>
      <p className="hint">
        테스트 설정의 환경 조건으로 시간을 흘려 당도가 어떻게 변하는지 계산합니다. 조건이 좋으면 당도가 오르고, 나쁘면 떨어집니다. 실행 중에도 설정을 바꾸면 바로 반영됩니다.
      </p>

      <div className="sim-controls">
        <button type="button" className="btn btn-primary" onClick={sim.toggle} aria-pressed={running}>
          {running ? '⏸ 일시정지' : hours > 0 ? '▶ 이어서 실행' : '▶ 예측 시작'}
        </button>
        <button type="button" className="btn" onClick={sim.reset} disabled={hours === 0}>
          ↺ 처음으로
        </button>
        <label className="inline">
          <span>속도</span>
          <select value={sim.speed} onChange={(e) => sim.setSpeed(Number(e.target.value))}>
            {SPEEDS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="inline check">
          <input type="checkbox" checked={sim.autoCycle} onChange={(e) => sim.setAutoCycle(e.target.checked)} />
          <span>낮/밤 자동 순환</span>
        </label>
      </div>

      <div className="sim-stats" aria-live="polite">
        <div>
          <span className="lbl">경과</span>
          <strong>{formatElapsed(hours)}</strong>
          <span className="sub">{sim.periodNow === 'day' ? '☀️ 낮' : '🌙 밤'}</span>
        </div>
        <div>
          <span className="lbl">현재 당도</span>
          <strong className="brix-now">{brix.toFixed(1)}°Bx</strong>
          <span className={`sub ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>
            시작 {startBrix.toFixed(1)} 대비 {delta > 0 ? '+' : ''}{delta.toFixed(1)}
          </span>
        </div>
        <div>
          <span className="lbl">이 조건의 목표 당도</span>
          <strong>
            {conditions.target.toFixed(1)}°Bx <span aria-hidden="true">{trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}</span>
          </strong>
          <span className="sub">{trend === 'up' ? '오르는 중' : trend === 'down' ? '떨어지는 중' : '유지'}</span>
        </div>
      </div>

      <div className="chart-inline">
        <BrixLine history={history} maxHours={sim.maxHours} target={conditions.target} />
        <ul className="legend">
          <li><span className="swatch" style={{ background: 'var(--c-green)' }} aria-hidden="true" />당도 변화</li>
          <li><span className="swatch swatch-target" aria-hidden="true" />목표 당도</li>
        </ul>
      </div>

      <h4 className="sub-title">당도에 영향을 주는 조건</h4>
      <ul className="factors">
        <li className="factor base">
          <span className="f-name">기본 당도 (일반 토마토 4~7°Bx의 가운데)</span>
          <span className="f-val">{BASE_BRIX.toFixed(1)}</span>
        </li>
        {conditions.factors.map((f) => (
          <li key={f.key} className={`factor tone-${f.tone}`}>
            <span className="f-icon" aria-hidden="true">{TONE_ICON[f.tone]}</span>
            <span className="f-name">
              {f.label} <small>{f.detail}</small>
              <span className="f-note">{f.note}</span>
            </span>
            <span className="f-val">{f.value > 0 ? '+' : ''}{f.value.toFixed(1)}</span>
          </li>
        ))}
      </ul>

      <div className={`verdict ${SIGNAL_CLS[conditions.signal.state]}`}>
        <strong>식물환자 판정: {conditions.signal.label}</strong>
        <span className="verdict-sub">
          관수 감량 {conditions.deficit}% → 예상 초음파 {conditions.signal.clicks}회/시간 (대조 0.6회) · 예상 수량 {conditions.yieldPct}%
        </span>
      </div>
      <p className="hint">
        당도만 보면 더 말릴수록 좋아 보이지만 수량이 줄어듭니다. 식물환자는 소리가 늘어나는 지점에서 감량을 멈춰 당도와 수량의 균형을 잡습니다.
        {hours === 0 && ` 시작 당도는 테스트 설정의 당도(${baseBrixInput}°Bx)입니다.`}
      </p>
      <details className="sources">
        <summary>모형 근거와 한계</summary>
        <ul>
          <li>일반 토마토 당도 4~7°Bx · 주간 적온 25~27℃, 야간 17℃ · 30℃ 이상 생육 불량 · 약광에서 당 함량 감소 · 시설 습도 70~80% — 제주특별자치도농업기술원 토마토 재배 자료</li>
          <li>온실 토마토 적정 VPD 0.8~1.1kPa — FarmRoad 토마토 환경 분석</li>
          <li>적당한 수분 부족에서 가용성 당 +48.7% — Liao et al., Foods (2024) · 관수 감량 시 당도↑·수량↓ — Lu et al. (2019)</li>
          <li>물 부족 시 초음파 약 35회/시간 — Khait et al., Cell (2023)</li>
          <li>요인별 점수와 변화 속도는 이 근거를 단순화한 가정값입니다. 실제 작물·품종·재배 방식에 따라 다릅니다.</li>
        </ul>
      </details>
    </article>
  )
}
