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
import { evaluateConditions } from '../domain/brixModel.js'
import { useAlertMail } from './useAlertMail.js'
import AlertMailCard from './components/AlertMailCard.jsx'

// 경보 상황: 한낮 고온·건조한 온실에서 물을 40% 줄인 상태 (감량 34% 이상이면 경보)
const ALARM_PRESET = { baseIrrigation: 400, irrigationReduction: 160, insideTemp: 32, insideHumidity: 40, period: 'day', weather: 'clear' }
// 정상: 기본 테스트값과 같은 환경, 감량 10%
const NORMAL_PRESET = { baseIrrigation: 400, irrigationReduction: 40, insideTemp: 24, insideHumidity: 70, period: 'day', weather: 'clear' }

// 발표 시연 모드 — 관수 브레이크 이야기를 약 20초에 자동으로 보여 준다 (테스트값 · 실제 측정 아님)
const DEMO_STEPS = [
  { at: 0, title: '준비', text: '물 충분(감량 10%) · 시작 당도 6.5°Bx · 아직 덜 자란 토마토', preset: { ...NORMAL_PRESET, brix: 6.5 }, run: false },
  { at: 3000, title: '1~3일차 · 감량', text: '하루 한 계단씩 물을 줄입니다 (감량 20%) → 당도가 오르고 토마토가 차오릅니다', preset: { irrigationReduction: 80 }, run: true },
  { at: 12000, title: '4일차 · 🟠 멈춤 신호', text: '감량 25%에서 초음파 소리가 대조 구역의 3배 → "오늘은 감량 멈춤" 알림', preset: { irrigationReduction: 100 } },
  { at: 15000, title: '5일차 · 🔴 경보', text: '고온·건조(32℃·40%)에 감량 40% → 소리 급증(32회/시간) → 즉시 관수 경보 메일', preset: ALARM_PRESET },
  { at: 18000, title: '6~7일차 · 한 계단 복귀', text: '바로 관수하고 감량 20%로 되돌립니다 → 정상으로 돌아오고 당도가 다시 오릅니다', preset: { ...NORMAL_PRESET, irrigationReduction: 80 } },
  { at: 24500, title: '시연 끝', text: '소리로 "멈출 지점"을 찾아 당도는 올리고, 작물은 지킵니다.', end: true },
]

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

  // 식물환자 판정이 경보·멈춤으로 바뀌거나, 경보 중에 관수 값을 바꿔 다시 경보가 나면 메일 알림
  const prevSignal = useRef({ st: sim.conditions.signal.state, base: state.preview.baseIrrigation, red: state.preview.irrigationReduction })
  useEffect(() => {
    const st = sim.conditions.signal.state
    const prev = prevSignal.current
    const waterChanged = prev.base !== state.preview.baseIrrigation || prev.red !== state.preview.irrigationReduction
    if ((st === 'alarm' || st === 'brake') && (st !== prev.st || waterChanged)) {
      mail.notify(st, {
        source: '대시보드 · 생육 예측',
        deficit: sim.conditions.deficit,
        clicks: sim.conditions.signal.clicks,
        brix: Math.round(sim.brix * 10) / 10,
        insideTemp: state.preview.insideTemp,
        insideHumidity: state.preview.insideHumidity,
      })
    }
    prevSignal.current = { st, base: state.preview.baseIrrigation, red: state.preview.irrigationReduction }
  }, [sim.conditions.signal.state, state.preview.baseIrrigation, state.preview.irrigationReduction]) // eslint-disable-line react-hooks/exhaustive-deps

  // 경보 상황 만들어 보기 / 정상으로 되돌리기: 위의 테스트 설정 값을 직접 바꾸고, 바뀐 칸을 잠깐 강조한다
  // 판정이 경보로 바뀌거나 경보 중 관수 값이 바뀌면 위 effect가 메일을 보낸다
  const applyPreset = (preset) => {
    const changed = Object.keys(preset).filter((k) => String(state.preview[k]) !== String(preset[k]))
    Object.entries(preset).forEach(([k, v]) => state.update(k, String(v)))
    setTimeout(() => {
      const first = document.getElementById(`f-${changed.find((k) => document.getElementById(`f-${k}`)) ?? 'insideTemp'}`)?.closest('.group')
      first?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
      changed.forEach((k) => {
        const el = document.getElementById(`f-${k}`)?.closest('.field') ?? document.querySelector(`[name="${k}"]`)?.closest('fieldset')
        if (!el) return
        el.classList.remove('flash')
        void el.offsetWidth // 애니메이션 다시 시작
        el.classList.add('flash')
      })
    }, 50)
    return changed
  }

  const [presetWhy, setPresetWhy] = useState(null)

  const triggerAlarm = () => {
    const changed = applyPreset(ALARM_PRESET)
    const c = evaluateConditions({ ...state.preview, ...ALARM_PRESET })
    setPresetWhy({
      tone: 'alarm',
      lines: [
        `관수 감량값 ${ALARM_PRESET.irrigationReduction}L → 하루 ${ALARM_PRESET.baseIrrigation}L 중 ${c.deficit}%를 줄임 (최종 ${ALARM_PRESET.baseIrrigation - ALARM_PRESET.irrigationReduction}L)`,
        `내부 ${ALARM_PRESET.insideTemp}℃ · 습도 ${ALARM_PRESET.insideHumidity}% 한낮 맑음 → 잎에서 물이 빨리 빠져나감`,
        `물이 모자라 초음파 소리가 시간당 ${c.signal.clicks}회 (평소 0.6회, 경보 기준 15회 이상)`,
        `→ 🔴 경보: 즉시 관수 필요 — 경보 메일을 보냈습니다`,
      ],
    })
    const waterSame = !changed.includes('baseIrrigation') && !changed.includes('irrigationReduction')
    if (waterSame && sim.conditions.signal.state === 'alarm') {
      // 이미 같은 경보 값이면 판정 변화가 없으므로 직접 보낸다
      mail.notify('alarm', {
        source: '경보 상황 만들어 보기',
        deficit: sim.conditions.deficit,
        clicks: sim.conditions.signal.clicks,
        brix: Math.round(sim.brix * 10) / 10,
        insideTemp: ALARM_PRESET.insideTemp,
        insideHumidity: ALARM_PRESET.insideHumidity,
      })
    }
  }

  const resetNormal = () => {
    applyPreset(NORMAL_PRESET)
    const c = evaluateConditions({ ...state.preview, ...NORMAL_PRESET })
    setPresetWhy({
      tone: 'ok',
      lines: [
        `관수 감량값 ${NORMAL_PRESET.irrigationReduction}L → ${c.deficit}%만 줄임 · 내부 ${NORMAL_PRESET.insideTemp}℃ · 습도 ${NORMAL_PRESET.insideHumidity}%`,
        `초음파 소리 시간당 ${c.signal.clicks}회 → 🟢 정상 (메일 없음)`,
      ],
    })
    announce({ message: '정상 값으로 되돌렸습니다. 다시 ‘경보 상황 만들어 보기’를 누르면 경보 메일이 갑니다.' })
  }

  // ── 발표 시연 모드 ──
  const [demo, setDemo] = useState({ on: false, step: -1 })
  const demoTimers = useRef([])
  const stopDemo = (keep = false) => {
    demoTimers.current.forEach(clearTimeout)
    demoTimers.current = []
    sim.pause()
    sim.setSpeed(6)
    if (!keep) setDemo({ on: false, step: -1 })
  }
  const startDemo = () => {
    stopDemo(true)
    sim.reset()
    setTab('dashboard')
    setPresetWhy(null)
    DEMO_STEPS.forEach((st, i) => {
      demoTimers.current.push(
        setTimeout(() => {
          setDemo({ on: true, step: i })
          if (st.preset) Object.entries(st.preset).forEach(([k, v]) => state.update(k, String(v)))
          if (i === 0) setTimeout(() => document.querySelector('.sim-card')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 100)
          if (st.run) {
            sim.setSpeed(8)
            sim.start()
          }
          if (st.end) {
            sim.pause()
            sim.setSpeed(6)
          }
        }, st.at),
      )
    })
  }
  useEffect(() => () => demoTimers.current.forEach(clearTimeout), [])

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

      <div className="demo-launch">
        <button type="button" className="btn btn-primary" onClick={startDemo} disabled={demo.on && !DEMO_STEPS[demo.step]?.end}>
          🎬 발표 시연 시작 (약 25초 · 7일)
        </button>
        <span className="hint">감량 → 당도 상승 → 🟠 멈춤 → 🔴 경보 → 복귀를 자동으로 보여 줍니다{mail.prefs.enabled ? ' · 경보 메일도 실제로 보냅니다' : ''}</span>
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
          <AlertMailCard mail={mail} onTriggerAlarm={triggerAlarm} onResetNormal={resetNormal} presetWhy={presetWhy} />
        </div>
      </main>

      {demo.on && (
        <div className={`demo-bar ${DEMO_STEPS[demo.step]?.end ? 'end' : ''}`} role="status" aria-live="polite">
          <div className="demo-dots" aria-hidden="true">
            {DEMO_STEPS.map((st, i) => <span key={st.title} className={i <= demo.step ? 'on' : ''} />)}
          </div>
          <strong>{DEMO_STEPS[demo.step]?.title}</strong>
          <p>{DEMO_STEPS[demo.step]?.text}</p>
          <div className="demo-actions">
            {DEMO_STEPS[demo.step]?.end && <button type="button" className="btn btn-primary" onClick={startDemo}>↻ 다시 보기</button>}
            <button type="button" className="btn" onClick={() => stopDemo()}>{DEMO_STEPS[demo.step]?.end ? '닫기' : '■ 시연 멈추기'}</button>
          </div>
        </div>
      )}

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
