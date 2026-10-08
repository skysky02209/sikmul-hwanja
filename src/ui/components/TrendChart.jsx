/** 간단한 SVG 선 그래프 (외부 라이브러리 없음) */
export default function TrendChart({ title, unit, series, nowHour, min, max }) {
  const W = 320
  const H = 150
  const P = { l: 34, r: 10, t: 12, b: 24 }
  const all = series.flatMap((s) => s.values)
  const lo = min ?? Math.floor(Math.min(...all) - 2)
  const hi = max ?? Math.ceil(Math.max(...all) + 2)
  const x = (i) => P.l + (i / 23) * (W - P.l - P.r)
  const y = (v) => P.t + (1 - (v - lo) / (hi - lo || 1)) * (H - P.t - P.b)
  const ticks = [lo, Math.round((lo + hi) / 2), hi]
  const summary = series.map((s) => `${s.name} ${Math.min(...s.values)}~${Math.max(...s.values)}${unit}`).join(', ')
  return (
    <figure className="chart">
      <figcaption>
        <span className="chart-title">{title}</span>
        <span className="chip chip-sim">예측</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title} 24시간 예측 추이: ${summary}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} className="gridline" />
            <text x={P.l - 6} y={y(t) + 4} textAnchor="end" className="axis">{t}</text>
          </g>
        ))}
        {[0, 6, 12, 18, 23].map((h) => (
          <text key={h} x={x(h)} y={H - 6} textAnchor="middle" className="axis">{h}시</text>
        ))}
        <line x1={x(nowHour)} x2={x(nowHour)} y1={P.t} y2={H - P.b} className="now" />
        {series.map((s) => (
          <polyline
            key={s.name}
            fill="none"
            stroke={s.color}
            strokeWidth="2.5"
            strokeLinejoin="round"
            points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
          />
        ))}
      </svg>
      <ul className="legend">
        {series.map((s) => (
          <li key={s.name}>
            <span className="swatch" style={{ background: s.color }} aria-hidden="true" />
            {s.name}
          </li>
        ))}
        <li><span className="swatch swatch-now" aria-hidden="true" />지금</li>
      </ul>
    </figure>
  )
}
