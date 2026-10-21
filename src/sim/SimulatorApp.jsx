import { useMemo, useState } from 'react'
import { APP_HREF } from '../ui/links.js'
import { useTestSettings } from '../ui/useTestSettings.js'
import { useCropSim } from '../ui/useCropSim.js'
import SettingsPanel from '../ui/components/SettingsPanel.jsx'
import GrowthSimCard from '../ui/components/GrowthSimCard.jsx'
import GreenhouseScene from '../ui/components/GreenhouseScene.jsx'
import { computeFinalIrrigation } from '../domain/irrigation.js'
import { recommendedStop } from '../domain/sharedModel.js'
import ResultTable from './ResultTable.jsx'
import ComboChart from './ComboChart.jsx'
import SevenDayCard from './SevenDayCard.jsx'

function readDemo() {
  try {
    return new URLSearchParams(window.location.search).get('demo')
  } catch {
    return null
  }
}

/** 당도 시뮬레이터 — 관수량에 따라 당도·수량·소득이 어떻게 바뀌는지 보여 주는 교육용 도구 */
export default function SimulatorApp() {
  const demo = useMemo(readDemo, [])
  const state = useTestSettings()
  const sim = useCropSim(state.preview)
  const [picked, setPicked] = useState(recommendedStop())
  const [status, setStatus] = useState('')
  const sceneSettings = sim.started ? { ...state.preview, period: sim.periodNow } : state.preview

  return (
    <div className={`sim-page ${demo === 'table' ? 'demo-table' : ''}`}>
      <div className="sim-notice" role="note">
        📘 공개 연구 수치에 맞춘 <b>교육용 시뮬레이션</b> · 실측값이 아니며 파일럿 실험으로 검증 예정
      </div>
      <header className="topbar sim-top">
        <div className="brand">
          <img src="./favicon.svg" alt="" width="32" height="32" />
          <div>
            <h1>당도 시뮬레이터</h1>
            <p>물을 줄이면 당도는 오르지만, 너무 줄이면 소득이 떨어진다</p>
          </div>
        </div>
        <a className="btn page-link-btn" href={APP_HREF}>‹ 식물환자 앱으로</a>
      </header>

      <main className="sim-main" id="main">
        <section className="sim-grid" aria-label="관수 단계별 결과">
          <ResultTable picked={picked} onPick={setPicked} />
          <ComboChart picked={picked} onPick={setPicked} />
        </section>
        <p className="sim-src">
          근거: 농촌진흥청 2024 기준 소득(2,437만 원) · Plants (2024) 수량 감소 · 단가 +30% 가정 · 당도는 모델 예시값 · 금액은 모두 가정
        </p>

        <section className="sim-growth" aria-labelledby="growth-title">
          <h2 id="growth-title" className="sim-h2">생육 예측 · 조건에 따른 당도 변화</h2>
          <div className="growth-grid">
            <div>
              <SettingsPanel
                state={state}
                title="생육 예측 조건"
                hint="온도·습도·날씨·관수 감량률을 바꾸면 오른쪽 예측에 바로 반영됩니다. 실제 센서 값이 아니라 입력값입니다."
                onSave={() => setStatus(state.save().message)}
                onReset={() => setStatus(state.reset().message)}
                onRevert={() => setStatus(state.revert().message)}
              />
              <p className="sr-only" role="status" aria-live="polite">{status}</p>
            </div>
            <div className="growth-right">
              <SevenDayCard settings={state.preview} />
              <GrowthSimCard sim={sim} baseBrixInput={state.preview.brix} />
              <GreenhouseScene
                s={sceneSettings}
                finalIrrigation={computeFinalIrrigation(state.preview.baseIrrigation, state.preview.irrigationReduction)}
                fruitBrix={sim.brix}
                simHours={sim.hours}
                signal={sim.conditions.signal.state}
                sim={sim}
              />
            </div>
          </div>
        </section>
      </main>
      <footer className="foot">식물환자 당도 시뮬레이터 (교육용) · <a href={APP_HREF}>식물환자 앱</a></footer>
    </div>
  )
}
