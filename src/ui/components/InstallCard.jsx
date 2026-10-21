import { installPlan, AREA_PER_ZONE, FEE_PER_MIC, FEE_PER_GREENHOUSE, BUY_SET_PRICE, BUY_APP_FEE } from '../../domain/sharedModel.js'

/** 설치 정보 — 면적(평)을 넣으면 마이크 수와 월 이용료(가정)를 계산한다 */
export default function InstallCard({ area, onArea }) {
  const plan = installPlan(area)
  return (
    <section className="panel" aria-labelledby="install-title" id="sec-install">
      <h2 id="install-title" className="panel-title">설치 정보</h2>
      <div className="card">
        <label className="field" htmlFor="area-input">
          <span>재배 면적 (평)</span>
          <input id="area-input" type="number" inputMode="numeric" min="1" max="100000" step="1" value={area} onChange={(e) => onArea(e.target.value)} aria-invalid={!plan} />
        </label>
        {!plan ? (
          <p className="error" role="alert">면적은 1평 이상 숫자로 입력해 주세요.</p>
        ) : (
          <dl className="install-grid">
            <div><dt>관수 구역</dt><dd>{plan.zones}곳</dd><small>구역 1곳 = 약 {AREA_PER_ZONE}평</small></div>
            <div><dt>감량 마이크</dt><dd>{plan.reductionMics}대</dd><small>올림(면적 ÷ {AREA_PER_ZONE})</small></div>
            <div><dt>대조 마이크</dt><dd>{plan.controlMics}대</dd><small>같은 온실·같은 작물마다 1대</small></div>
            <div className="wide"><dt>월 대여료 <span className="chip chip-test">가정</span></dt><dd>{(plan.monthlyFee * 10000).toLocaleString('ko-KR')}원</dd><small>온실 {FEE_PER_GREENHOUSE}만 + 감량 마이크 {plan.reductionMics}대 × {FEE_PER_MIC}만 원 · 자동 관수 포함 · 초기·설치비 0원</small></div>
          </dl>
        )}
        <p className="hint">예: 300평 → 월 150,000원 · 900평 → 감량 3대 + 대조 1대, 월 300,000원 (부가세 별도 가정). 3년 넘게 쓰면 구매(세트 {BUY_SET_PRICE}만 원 + 앱 월 {BUY_APP_FEE}만 원)가 유리합니다. 구역 수에 맞춰 위 구역별 상태 카드도 바뀝니다.</p>
      </div>
    </section>
  )
}
