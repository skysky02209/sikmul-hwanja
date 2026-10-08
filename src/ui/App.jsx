import { useEffect, useMemo, useRef, useState } from 'react'
import { getActiveProvider } from '../data/providerRegistry.js'
import { getIrrigationController, buildIrrigationPlan } from '../api/irrigationController.js'
import { useTestSettings } from './useTestSettings.js'
import { useCropSim } from './useCropSim.js'
import Dashboard from './components/Dashboard.jsx'
import SettingsPanel from './components/SettingsPanel.jsx'
import ApplyDialog from './components/ApplyDialog.jsx'
import BrakeSim from './components/BrakeSim.jsx'
import { LEVEL_MODEL } from '../domain/brakeSim.js'
import { useAlertMail } from './useAlertMail.js'
import AlertMailCard from './components/AlertMailCard.jsx'

const TABS = [
  { id: 'dashboard', label: '대시보드' },
  { id: 'brake', label: '감량 관리' },
  { id: 'settings', label: '테스트 설정' },
]

export default function App() {
  const state = useTestSettings()
  const sim = useCropSim(state.preview)
  const provider = getActiveProvider()
  const controller = useMemo(() => getIrrigationController(), [])
  const snapshot = useMemo(() => provider.getSnapshot(state.preview), [provider, state.preview])
  const [tab, setTab] = useState('dashboard')
  const [status, setStatus] = useState({ id: 0, text: '' })
  const [dialog, setDialog] = useState({ open: false, result: null })
  const [log, setLog] = useState([])

  const announce = (r) => setStatus((s) => ({ id: s.id + 1, text: r.message }))
  const mail = useAlertMail({ onStatus: (m) => announce({ message: m }) })

  // 식물환자 판정이 경보·멈춤으로 바뀌는 순간 메일 알림
  const prevSignal = useRef(sim.conditions.signal.state)
  useEffect(() => {
    const st = sim.conditions.signal.state
    if (st !== prevSignal.current && (st === 'alarm' || st === 'brake')) {
      mail.notify(st, {
        source: '대시보드 · 생육 예측',
        deficit: sim.conditions.deficit,
        clicks: sim.conditions.signal.clicks,
        brix: Math.round(sim.brix * 10) / 10,
        insideTemp: state.preview.insideTemp,
        insideHumidity: state.preview.insideHumidity,
      })
    }
    prevSignal.current = st
  }, [sim.conditions.signal.state]) // eslint-disable-line react-hooks/exhaustive-deps

  const onBrakeSignal = (st, day) =>
    mail.notify(st, {
      source: `감량 관리 · ${day.day}일차`,
      level: day.level,
      clicks: day.clicks,
      insideTemp: state.preview.insideTemp,
      insideHumidity: state.preview.insideHumidity,
    })

  const applyLevel = (level) => {
    const base = state.preview.baseIrrigation
    state.update('irrigationReduction', String(Math.round(base * (1 - level / 100))))
    state.update('brix', String(LEVEL_MODEL[level].brix))
    announce({ message: `관수 ${level}% 단계를 테스트 설정에 미리 반영했습니다. 유지하려면 테스트 설정에서 저장하세요.` })
    setTab('dashboard')
    window.scrollTo?.({ top: 0, behavior: 'smooth' })
  }

  const apply = async () => {
    const result = await controller.apply(buildIrrigationPlan(state.preview))
    setLog((l) => [result, ...l].slice(0, 20))
    setDialog({ open: true, result })
  }

  return (
    <div className="app">
      <a className="skip" href="#main">본문으로 건너뛰기</a>
      <header className="topbar">
        <div className="brand">
          <img src="./favicon.svg" alt="" width="32" height="32" />
          <div>
            <h1>식물환자</h1>
            <p>재배 환경 · 관수 대시보드</p>
          </div>
        </div>
        <div className="top-chips">
          {mail.prefs.enabled && mail.emailOk && <span className="chip chip-live" title={mail.prefs.email}>📧 메일 알림 켜짐</span>}
          <span className="chip chip-mode">테스트 모드</span>
        </div>
      </header>

      <div className="banner" role="note">
        <strong>테스트 모드</strong> · 아직 실제 센서와 관수 장치가 연결되어 있지 않습니다. 화면의 값은 테스트 설정에서 입력한 값과 그 값으로 계산한 예측입니다.
        <span className="banner-src"> 데이터 출처: {provider.label}</span>
      </div>

      <nav className="tabs" role="tablist" aria-label="화면 선택">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`pane-${t.id}`}
            className={`tab tab-${t.id} ${tab === t.id ? 'on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'settings' && state.dirty && <span className="dot" aria-label="저장 안 된 변경 있음" />}
          </button>
        ))}
      </nav>

      <main id="main" className="layout" data-tab={tab}>
        <div id="pane-dashboard" role="tabpanel" aria-labelledby="tab-dashboard" className={`pane ${tab === 'dashboard' ? 'show' : ''}`}>
          <Dashboard snapshot={snapshot} settings={state.preview} onApply={apply} sim={sim} />
        </div>
        <div id="pane-brake" role="tabpanel" aria-labelledby="tab-brake" className={`pane ${tab === 'brake' ? 'show' : ''}`}>
          <BrakeSim baseIrrigation={state.preview.baseIrrigation} onApplyToSettings={applyLevel} onSignal={onBrakeSignal} />
        </div>
        <div id="pane-settings" role="tabpanel" aria-labelledby="tab-settings" className={`pane ${tab === 'settings' ? 'show' : ''}`}>
          <SettingsPanel
            state={state}
            onSave={() => announce(state.save())}
            onReset={() => announce(state.reset())}
            onRevert={() => announce(state.revert())}
          />
          <AlertMailCard mail={mail} />
        </div>
      </main>

      <p className="sr-only" role="status" aria-live="polite">{status.text}</p>
      {status.text && (
        <div className="toast" aria-hidden="true" key={status.id} onAnimationEnd={() => setStatus((s) => ({ ...s, text: '' }))}>
          {status.text}
        </div>
      )}

      <footer className="foot">
        식물환자 · 재배 환경·관수 관리 앱 (시제품) · 센서·관수 장치 연동 준비 중
      </footer>

      <ApplyDialog open={dialog.open} result={dialog.result} log={log} onClose={() => setDialog((d) => ({ ...d, open: false }))} />
    </div>
  )
}
