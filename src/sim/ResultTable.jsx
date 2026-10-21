import { outcomeTable, recommendedStop, STATE_ICON } from '../domain/sharedModel.js'

const won = (manwon) => `${manwon.toLocaleString('ko-KR')}만 원`

/** 관수 단계별 결과 표 (300평 기준) — 발표자료와 같은 값 */
export default function ResultTable({ picked, onPick }) {
  const rows = outcomeTable()
  const stop = recommendedStop()
  return (
    <article className="card sim-table" aria-labelledby="tbl-title">
      <div className="card-head">
        <h2 id="tbl-title">관수 단계별 결과 (300평 기준)</h2>
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
      <p className="stop-note">⭐ <b>{stop}%</b>: 소리가 늘어나는 지점에서 멈추면 균형점 — 당도는 오르고 소득이 가장 높습니다. 더 줄이면 당도는 조금 더 오르지만 수량이 줄어 소득이 떨어집니다.</p>
    </article>
  )
}
