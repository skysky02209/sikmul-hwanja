import { useEffect, useMemo, useState } from 'react'

const KEY = 'sikmul-hwanja.harvest.v1'

function load() {
  try {
    const raw = window.localStorage.getItem(KEY)
    const v = raw ? JSON.parse(raw) : []
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

/** 수확 당도 기록 — 농가가 당도계로 직접 잰 값을 작기별로 적는다 (실시간 측정값이 아님) */
export default function HarvestLog({ zones }) {
  const [rows, setRows] = useState(load)
  const [season, setSeason] = useState('2026 가을작')
  const [zone, setZone] = useState(zones[0]?.name ?? '1구역')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [brix, setBrix] = useState('')
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(rows))
    } catch {
      /* 저장 불가 환경 */
    }
  }, [rows])

  const add = (e) => {
    e.preventDefault()
    const n = Number(String(brix).trim())
    if (brix === '' || !Number.isFinite(n) || n < 0 || n > 30) {
      setErr('당도는 0~30°Bx 사이 숫자로 입력해 주세요.')
      setSaved(false)
      return
    }
    if (!season.trim()) {
      setErr('작기 이름을 입력해 주세요. (예: 2026 가을작)')
      return
    }
    setErr('')
    setRows((r) => [{ id: Date.now(), season: season.trim(), zone, date, brix: Math.round(n * 10) / 10 }, ...r].slice(0, 100))
    setBrix('')
    setSaved(true)
  }

  const bySeason = useMemo(() => {
    const m = new Map()
    rows.forEach((r) => {
      const a = m.get(r.season) ?? []
      a.push(r.brix)
      m.set(r.season, a)
    })
    return [...m.entries()].map(([s, v]) => ({ season: s, n: v.length, avg: Math.round((v.reduce((x, y) => x + y, 0) / v.length) * 10) / 10 }))
  }, [rows])

  return (
    <section className="panel" aria-labelledby="harvest-title" id="sec-harvest">
      <h2 id="harvest-title" className="panel-title">수확 당도 기록</h2>
      <p className="hint">수확할 때 <b>당도계로 직접 잰 값</b>을 작기별로 적어 두세요. 실시간으로 재는 값이 아닙니다.</p>
      <form className="card harvest-form" onSubmit={add} noValidate>
        <div className="harvest-grid">
          <label className="field">
            <span>작기</span>
            <input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="2026 가을작" />
          </label>
          <label className="field">
            <span>구역</span>
            <select value={zone} onChange={(e) => setZone(e.target.value)}>
              {zones.map((z) => <option key={z.id} value={z.name}>{z.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>수확일</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span>당도 (°Bx)</span>
            <input type="number" inputMode="decimal" step="0.1" min="0" max="30" value={brix} onChange={(e) => { setBrix(e.target.value); setSaved(false) }} placeholder="예: 7.6" aria-invalid={Boolean(err)} />
          </label>
        </div>
        {err && <p className="error" role="alert">{err}</p>}
        <button type="submit" className="btn btn-primary btn-block">기록 추가</button>
        <p className={`notice ${saved ? 'pop' : ''}`} role="status">📌 기록한 수확 당도는 <b>다음 작기 멈춤 기준 보정에 사용</b>됩니다. (기록은 이 브라우저에만 저장)</p>
      </form>
      {bySeason.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">작기별 수확 당도 평균</caption>
            <thead><tr><th scope="col">작기</th><th scope="col">기록 수</th><th scope="col">평균 당도</th></tr></thead>
            <tbody>
              {bySeason.map((s) => <tr key={s.season}><th scope="row">{s.season}</th><td>{s.n}건</td><td>{s.avg.toFixed(1)}°Bx</td></tr>)}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 0 && (
        <ul className="harvest-list" aria-label="수확 당도 기록">
          {rows.slice(0, 8).map((r) => (
            <li key={r.id}>
              <span>{r.date} · {r.season} · {r.zone}</span>
              <b>{r.brix.toFixed(1)}°Bx</b>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRows((x) => x.filter((y) => y.id !== r.id))} aria-label={`${r.date} 기록 삭제`}>삭제</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
