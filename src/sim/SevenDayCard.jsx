import { evaluateConditions, stepBrix, BRIX_FLOOR } from '../domain/sharedModel.js'

const fmt = (v) => (Math.round(v * 10) / 10).toFixed(1)

/** 7일 당도 변화 — 지금 입력한 조건이 7일(168시간) 이어질 때 (모델 예시값) */
export default function SevenDayCard({ settings }) {
  const start = Number(settings.brix)
  const ok = Number.isFinite(start)
  const target = evaluateConditions(settings).target
  const after = ok ? stepBrix(start, target, 168) : NaN
  const diff = ok ? Math.round((after - start) * 10) / 10 : NaN
  return (
    <article className="card seven-card" aria-labelledby="seven-title">
      <div className="card-head">
        <h2 id="seven-title">7일 당도 변화</h2>
        <span className="chip chip-test">모델 예시값</span>
      </div>
      <div className="seven-tiles">
        <div><span>시작 당도</span><b>{ok ? fmt(start) : '—'}<small>°Bx</small></b></div>
        <div><span>7일 후</span><b>{ok ? fmt(after) : '—'}<small>°Bx</small></b></div>
        <div className={diff < 0 ? 'down' : 'up'}><span>변화</span><b>{ok ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}` : '—'}<small>°Bx</small></b></div>
        <div><span>하한</span><b>{BRIX_FLOOR.toFixed(1)}<small>°Bx</small></b></div>
      </div>
      <p className="hint">하루 최대 ±0.25°Bx씩만 바뀌고, 떨어질 때도 {BRIX_FLOOR.toFixed(1)}°Bx 아래로는 내려가지 않습니다.</p>
    </article>
  )
}
