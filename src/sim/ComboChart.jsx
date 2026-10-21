import { outcomeTable, recommendedStop } from '../domain/sharedModel.js'

/** 관수 단계별 당도(선) + 300평 소득(막대) */
export default function ComboChart({ picked, onPick }) {
  const rows = outcomeTable()
  const stop = recommendedStop()
  const W = 560
  const H = 320
  const P = { l: 56, r: 56, t: 24, b: 44 }
  const iw = W - P.l - P.r
  const ih = H - P.t - P.b
  const bw = iw / rows.length
  const incMax = 3500
  const bMin = 5
  const bMax = 9
  const yInc = (v) => P.t + ih - (v / incMax) * ih
  const yB = (b) => P.t + ih - ((b - bMin) / (bMax - bMin)) * ih
  const cx = (i) => P.l + bw * i + bw / 2
  const pts = rows.map((r, i) => `${cx(i)},${yB(r.brix)}`).join(' ')
  const label = rows.map((r) => `관수 ${r.level}%: 당도 ${r.brix}°Bx, 300평 소득 ${r.income}만 원`).join('; ')
  return (
    <figure className="card combo">
      <figcaption className="card-head">
        <h2>당도(선) · 300평 소득(막대)</h2>
        <span className="chip chip-test">가정</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {[0, 1000, 2000, 3000].map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={yInc(v)} y2={yInc(v)} className="gridline" />
            <text x={P.l - 8} y={yInc(v) + 4} textAnchor="end" className="axis">{v.toLocaleString('ko-KR')}</text>
          </g>
        ))}
        {[5, 6, 7, 8, 9].map((b) => (
          <text key={b} x={W - P.r + 8} y={yB(b) + 4} className="axis axis-brix">{b}</text>
        ))}
        <text x={P.l - 8} y={P.t - 8} textAnchor="end" className="axis">만 원</text>
        <text x={W - P.r + 8} y={P.t - 8} className="axis axis-brix">°Bx</text>
        {rows.map((r, i) => {
          const x = P.l + bw * i + bw * 0.2
          const on = r.level === stop
          return (
            <g key={r.level} onClick={() => onPick?.(r.level)} style={{ cursor: 'pointer' }}>
              {picked === r.level && <rect x={P.l + bw * i + 4} y={P.t} width={bw - 8} height={ih} rx="8" className="bar-pick" />}
              <rect x={x} y={yInc(r.income)} width={bw * 0.6} height={P.t + ih - yInc(r.income)} rx="4" className={on ? 'bar-income-on' : 'bar-income'} />
              <text x={cx(i)} y={yInc(r.income) - 6} textAnchor="middle" className="axis val">{r.income.toLocaleString('ko-KR')}</text>
              <text x={cx(i)} y={H - 18} textAnchor="middle" className="axis" fontWeight={on ? 800 : 500}>{r.level}%</text>
              {on && <text x={cx(i)} y={H - 4} textAnchor="middle" className="axis stop-lbl">멈춤 지점</text>}
            </g>
          )
        })}
        <polyline points={pts} fill="none" className="brix-line" />
        {rows.map((r, i) => (
          <g key={`b${r.level}`}>
            <circle cx={cx(i)} cy={yB(r.brix)} r="6" className="brix-dot" />
            <text x={cx(i) + 9} y={yB(r.brix) - 8} className="axis brix-val">{r.brix.toFixed(1)}</text>
          </g>
        ))}
      </svg>
      <ul className="legend">
        <li><span className="swatch" style={{ background: 'var(--c-green)' }} aria-hidden="true" />300평 소득 (만 원)</li>
        <li><span className="swatch" style={{ background: 'var(--c-gold)' }} aria-hidden="true" />당도 (°Bx)</li>
      </ul>
    </figure>
  )
}
