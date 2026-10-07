import { useEffect, useRef } from 'react'

/** 관수 적용 결과 대화상자 — 테스트 모드에서는 장치로 아무것도 보내지 않는다 */
export default function ApplyDialog({ open, result, log, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal?.()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog ref={ref} className="dialog" aria-labelledby="apply-title" onClose={onClose} onCancel={onClose}>
      <h2 id="apply-title">관수 적용 (테스트 모드)</h2>
      {result && (
        <>
          <p className="notice" role="status">{result.message}</p>
          <dl className="irr">
            <div><dt>기본 관수량</dt><dd>{result.plan.baseLitersPerDay}<span className="unit">L/일</span></dd></div>
            <div><dt>관수 감량값</dt><dd>−{result.plan.reductionLitersPerDay}<span className="unit">L/일</span></dd></div>
            <div className="irr-final"><dt>적용 예정 최종 관수량</dt><dd>{result.plan.finalLitersPerDay}<span className="unit">L/일</span></dd></div>
          </dl>
          <p className="hint">장치 전송: <strong>보내지 않음</strong> · 연결된 관수 장치: 없음</p>
        </>
      )}
      {log.length > 0 && (
        <details>
          <summary>이번 접속의 테스트 적용 기록 ({log.length}건)</summary>
          <ol className="log">
            {log.map((r) => (
              <li key={r.at}>
                {new Date(r.at).toLocaleTimeString('ko-KR')} · 최종 {r.plan.finalLitersPerDay} L/일 · 전송 안 함
              </li>
            ))}
          </ol>
        </details>
      )}
      <form method="dialog">
        <button className="btn btn-primary btn-block" autoFocus>
          확인
        </button>
      </form>
    </dialog>
  )
}
