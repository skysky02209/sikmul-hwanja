import { outcomeTable, recommendedStop, STATE_ICON } from '../domain/sharedModel.js'

const won = (manwon) => `${manwon.toLocaleString('ko-KR')}만 원`

/** 관수 단계별 결과 표 (300평 기준) — 발표자료와 같은 값 */
export default function ResultTable({ picked, onPick }) {
  const rows = outcomeTable()
  const stop = recommendedStop()
  const stopRow = rows.find((r) => r.level === stop) ?? rows[0]
  const gain = stopRow.income - rows[0].income
  return (
    <article className="card sim-table" aria-labelledby="tbl-title">
      <div className="card-head">
        <h2 id="tbl-title">관수 단계별 결과 <small className="h-sub">300평 기준</small></h2>
        <span className="chip chip-test">가정</span>
      </div>
      <div className="table-wrap">
        <table className="table big-table">
          <caption className="sr-only">관수 단계별 당도, 수량, 300평 소득 — 행을 누르면 그래프에서 강조됩니다</caption>
          <thead>
            <tr><th scope="col">관수</th><th scope="col">당도</th><th scope="col">수량</th><th scope="col">300평 소득</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.level} className={`row-click ${r.level === stop ? 'row-stop' : ''} ${picked === r.level ? 'row-picked' : ''}`} onClick={() => onPick?.(r.level)}>
                <th scope="row">{STATE_ICON[r.verdict]} {r.level}%{r.level === stop && <span className="chip chip-stop">멈춤 지점</span>}</th>
                <td>{r.brix.toFixed(1)}°Bx</td>
                <td>{r.yieldPct}%</td>
                <td><b>{won(r.income)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tbl-note">300평 ≈ 10a(1,000㎡) · 수량·소득은 가정값</p>
      <div className="stop-note">
        <span>⭐ 소리가 늘어나는 지점에서 멈추면 균형점</span>
        <b>멈춤 지점 {stop}% → 당도 {stopRow.brix.toFixed(1)}°Bx · 300평 소득 {won(stopRow.income)}</b>
        <small>(감량 안 할 때 대비 {gain >= 0 ? '+' : ''}{won(gain)})</small>
      </div>
    </article>
  )
}
