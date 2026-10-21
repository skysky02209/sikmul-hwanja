import { useEffect, useMemo, useRef, useState } from 'react'
import { useTestSettings } from './useTestSettings.js'
import SettingsPanel from './components/SettingsPanel.jsx'
import ZoneCards from './components/ZoneCards.jsx'
import ReductionManager from './components/ReductionManager.jsx'
import HarvestLog from './components/HarvestLog.jsx'
import InstallCard from './components/InstallCard.jsx'
import AlertMailCard from './components/AlertMailCard.jsx'
import { useAlertMail } from './useAlertMail.js'
import { playPlantSound } from './audio/plantSound.js'
import { deficitPct, zoneStatus, installPlan, STATE_NAME } from '../domain/sharedModel.js'

// 경보 상황: 한낮 고온·건조한 온실에서 물을 40% 줄인 상태 → 1구역 관수 60% → 경보
const ALARM_PRESET = { baseIrrigation: 400, irrigationReduction: 160, insideTemp: 32, insideHumidity: 40, period: 'day', weather: 'clear' }
// 정상: 기본 테스트값과 같은 환경, 감량 10% → 1구역 관수 90%
const NORMAL_PRESET = { baseIrrigation: 400, irrigationReduction: 40, insideTemp: 24, insideHumidity: 70, period: 'day', weather: 'clear' }

const MAX_ZONES = 6
const EXTRA_DEFAULT = [80, 90, 80, 90, 80] // 2구역부터의 기본 관수 단계 (테스트값)
const AREA_KEY = 'sikmul-hwanja.area.v1'

// 발표 시연 — 감량 → 소리 증가 → 🟠 감량 멈춤 → 🔴 경보 → 복귀 (약 25초, 테스트값)
const DEMO_STEPS = [
  { at: 0, title: '준비', text: '모든 구역 정상 · 관수 90%에서 시작합니다', levels: { z1: 90, z2: 90, z3: 90 } },
  { at: 3000, title: '① 감량', text: '1구역을 하루 한 계단 감량 (90% → 80%) · 소리 1.6회/시간 — 대조 구역과 비슷해 정상', levels: { z1: 80 } },
  { at: 8000, title: '② 소리 증가', text: '한 계단 더 줄이자(70%) 감량 구역 소리가 6회/시간으로 늘었습니다 (대조 구역 0.6회의 10배)', levels: { z1: 70 }, sound: 6 },
  { at: 12500, title: '③ 🟠 감량 멈춤', text: '대조 구역의 3배를 넘었습니다 → "오늘은 감량 멈춤 — 80%로 한 계단 복귀" 알림' },
  { at: 16000, title: '④ 🔴 경보', text: '2구역: 폭염에 물이 끊겨 소리 32회/시간 → 경보, 지금 바로 관수하라는 메일', levels: { z2: 60 }, sound: 32 },
  { at: 20000, title: '⑤ 복귀', text: '1구역은 80%로 한 계단 복귀, 2구역은 바로 관수 후 80% → 모두 정상', levels: { z1: 80, z2: 80 } },
  { at: 24500, title: '시연 끝', text: '소리로 "멈출 지점"을 찾아 당도는 올리고, 작물은 지킵니다.', end: true },
]

const NAV = [
  ['sec-zones', '상태'], ['sec-brake', '감량'], ['sec-alert', '알림'], ['sec-harvest', '기록'], ['sec-install', '설치'], ['sec-settings', '설정'],
]

function readDemoParam() {
  try {
    const d = new URLSearchParams(window.location.search).get('demo')
    return d === 'stop' || d === 'alert' ? d : null
  } catch {
    return null
  }
}

function loadArea() {
  try {
    const v = Number(window.localStorage.getItem(AREA_KEY))
    return v > 0 ? v : 900
  } catch {
    return 900
  }
}

export default function App() {
  const demoParam = useMemo(readDemoParam, [])
  const state = useTestSettings()
  const [status, setStatus] = useState({ id: 0, text: '' })
  const announce = (r) => setStatus((s) => ({ id: s.id + 1, text: r.message }))
  const mail = useAlertMail({ onStatus: (m) => announce({ message: m }) })
  const muted = useRef(Boolean(demoParam)) // 캡처용 화면(?demo=)에서는 메일을 보내지 않는다

  const [area, setArea] = useState(() => (demoParam ? 900 : loadArea()))
  useEffect(() => {
    if (demoParam) return
    try {
      window.localStorage.setItem(AREA_KEY, String(area))
    } catch {
      /* 저장 불가 */
    }
  }, [area, demoParam])
  const plan = installPlan(area)
  const zoneCount = Math.max(1, Math.min(MAX_ZONES, plan?.zones ?? 1))

  // 1구역 = 테스트 설정의 관수값과 연결 (감량률 → 관수 단계)
  const z1Level = Math.round((100 - deficitPct(state.preview.baseIrrigation, state.preview.irrigationReduction)) * 10) / 10
  const [extra, setExtra] = useState({})
  const zones = useMemo(
    () => Array.from({ length: zoneCount }, (_, i) => ({
      id: `z${i + 1}`,
      name: `${i + 1}구역`,
      level: i === 0 ? z1Level : extra[`z${i + 1}`] ?? EXTRA_DEFAULT[(i - 1) % EXTRA_DEFAULT.length],
    })),
    [zoneCount, z1Level, extra],
  )
  const [selectedId, setSelectedId] = useState('z1')

  const notifyZone = (zone, st) => {
    if (muted.current) return
    mail.notify(st.state, { source: '식물환자 앱 · 구역별 상태', zone: zone.name, level: st.level, clicks: st.clicks })
  }

  const setLevel = (id, lv) => {
    if (id === 'z1') {
      const base = state.preview.baseIrrigation > 0 ? state.preview.baseIrrigation : 400
      if (!(state.preview.baseIrrigation > 0)) state.update('baseIrrigation', String(base))
      state.update('irrigationReduction', String(Math.round(base * (1 - lv / 100))))
      return // 1구역 메일은 아래 effect가 보낸다
    }
    const zone = zones.find((z) => z.id === id)
    const before = zone ? zoneStatus(zone.level).state : 'continue'
    setExtra((e) => ({ ...e, [id]: lv }))
    const after = zoneStatus(lv)
    if (zone && after.state !== 'continue' && after.state !== before) notifyZone(zone, after)
  }

  // 1구역 판정이 감량 멈춤·경보로 바뀌거나, 경보 중 관수 값을 다시 바꾸면 메일
  const z1State = zoneStatus(z1Level).state
  const prev = useRef({ st: z1State, base: state.preview.baseIrrigation, red: state.preview.irrigationReduction })
  useEffect(() => {
    const p = prev.current
    const waterChanged = p.base !== state.preview.baseIrrigation || p.red !== state.preview.irrigationReduction
    if (z1State !== 'continue' && (z1State !== p.st || waterChanged)) notifyZone(zones[0], zoneStatus(z1Level))
    prev.current = { st: z1State, base: state.preview.baseIrrigation, red: state.preview.irrigationReduction }
  }, [z1State, state.preview.baseIrrigation, state.preview.irrigationReduction]) // eslint-disable-line react-hooks/exhaustive-deps

  // 캡처용 화면: ?demo=stop (1구역 감량 멈춤) · ?demo=alert (2구역 경보 + 알림)
  useEffect(() => {
    if (!demoParam) return
    const base = 400
    state.update('baseIrrigation', String(base))
    if (demoParam === 'stop') {
      state.update('irrigationReduction', String(base * 0.3))
      setExtra({ z2: 80, z3: 90 })
      setSelectedId('z1')
    } else {
      state.update('irrigationReduction', String(base * 0.2))
      setExtra({ z2: 60, z3: 90 })
      setSelectedId('z2')
    }
    prev.current = { st: demoParam === 'stop' ? 'brake' : 'continue', base, red: demoParam === 'stop' ? base * 0.3 : base * 0.2 }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 경보 상황 만들어 보기 / 정상으로 되돌리기 (테스트 설정 값을 바꾸고, 바뀐 칸을 잠깐 강조) ──
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [presetWhy, setPresetWhy] = useState(null)
  const applyPreset = (preset) => {
    const changed = Object.keys(preset).filter((k) => String(state.preview[k]) !== String(preset[k]))
    Object.entries(preset).forEach(([k, v]) => state.update(k, String(v)))
    setSettingsOpen(true)
    setTimeout(() => {
      changed.forEach((k) => {
        const el = document.getElementById(`f-${k}`)?.closest('.field') ?? document.querySelector(`[name="${k}"]`)?.closest('fieldset')
        if (!el) return
        el.classList.remove('flash')
        void el.offsetWidth
        el.classList.add('flash')
      })
      document.getElementById('sec-zones')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    }, 80)
    return changed
  }
  const triggerAlarm = () => {
    muted.current = false
    const changed = applyPreset(ALARM_PRESET)
    const lv = 100 - deficitPct(ALARM_PRESET.baseIrrigation, ALARM_PRESET.irrigationReduction)
    const st = zoneStatus(lv)
    setPresetWhy({
      tone: 'alarm',
      lines: [
        `테스트 설정: 관수 감량값 ${ALARM_PRESET.irrigationReduction}L → 하루 ${ALARM_PRESET.baseIrrigation}L 중 ${100 - lv}% 줄임 → 1구역 관수 ${st.level}%`,
        `내부 ${ALARM_PRESET.insideTemp}℃ · 습도 ${ALARM_PRESET.insideHumidity}% 한낮 맑음 → 잎에서 물이 빨리 빠져나감`,
        `감량 구역 소리 시간당 ${st.clicks}회 (대조 구역 ${st.control}회, 경보 기준 15회 이상)`,
        '→ 🔴 경보: 지금 바로 관수 — 경보 메일을 보냈습니다',
      ],
    })
    const waterSame = !changed.includes('baseIrrigation') && !changed.includes('irrigationReduction')
    if (waterSame && z1State === 'alarm') notifyZone(zones[0], zoneStatus(z1Level))
  }
  const resetNormal = () => {
    applyPreset(NORMAL_PRESET)
    setExtra({})
    const lv = 100 - deficitPct(NORMAL_PRESET.baseIrrigation, NORMAL_PRESET.irrigationReduction)
    const st = zoneStatus(lv)
    setPresetWhy({ tone: 'ok', lines: [`1구역 관수 ${st.level}% · 소리 시간당 ${st.clicks}회 → 🟢 정상 (메일 없음)`] })
    announce({ message: '정상 값으로 되돌렸습니다. 다시 ‘경보 상황 만들어 보기’를 누르면 경보 메일이 갑니다.' })
  }

  // ── 발표 시연 ──
  const [demo, setDemo] = useState({ on: false, step: -1 })
  const timers = useRef([])
  const stopDemo = (keep = false) => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    if (!keep) setDemo({ on: false, step: -1 })
  }
  const startDemo = () => {
    stopDemo(true)
    muted.current = false
    setPresetWhy(null)
    if (zoneCount < 2) setArea(900)
    Object.entries(NORMAL_PRESET).forEach(([k, v]) => state.update(k, String(v)))
    DEMO_STEPS.forEach((st, i) => {
      timers.current.push(setTimeout(() => {
        setDemo({ on: true, step: i })
        if (st.levels) Object.entries(st.levels).forEach(([id, lv]) => setLevel(id, lv))
        if (st.levels?.z2 !== undefined) setSelectedId('z2')
        else if (st.levels?.z1 !== undefined) setSelectedId('z1')
        if (st.sound) playPlantSound(st.sound, 3)
        if (i === 0) document.getElementById('sec-zones')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
        if (st.end) timers.current.push(setTimeout(() => setDemo({ on: false, step: -1 }), 8000))
      }, st.at))
    })
  }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const alarms = zones.filter((z) => zoneStatus(z.level).state === 'alarm')
  const brakes = zones.filter((z) => zoneStatus(z.level).state === 'brake')

  return (
    <div className={`app ${demo.on ? 'demo-on' : ''}`}>
      <a className="skip" href="#main">본문으로 건너뛰기</a>
      <header className="topbar">
        <div className="brand">
          <img src="./favicon.svg" alt="" width="32" height="32" />
          <div>
            <h1>식물환자</h1>
            <p>관수 감량 경보 앱</p>
          </div>
        </div>
        <div className="top-chips">
          {mail.prefs.enabled && mail.emailOk && <span className="chip chip-live" title={mail.prefs.email}>📧 알림 켜짐</span>}
          <span className="chip chip-mode">테스트 모드</span>
        </div>
      </header>
      <div className="banner banner-one" role="note">
        <strong>테스트 모드</strong> · 센서 연동 전, 입력값으로 동작합니다
        <a className="page-link" href="./simulator.html">당도 시뮬레이터 보기 →</a>
      </div>

      <nav className="sec-nav" aria-label="화면 바로가기">
        {NAV.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
      </nav>

      <main id="main" className="layout app-main">
        <div id="sec-zones" className="anchor">
          {(alarms.length > 0 || brakes.length > 0) && (
            <div className={`alert-banner ${alarms.length ? 'st-alarm' : 'st-brake'}`} role="alert">
              {alarms.length > 0 && (
                <p><strong>🔴 {alarms.map((z) => z.name).join(' · ')} {STATE_NAME.alarm}</strong> — 지금 바로 관수하세요</p>
              )}
              {brakes.length > 0 && (
                <p><strong>🟠 {brakes.map((z) => z.name).join(' · ')} {STATE_NAME.brake}</strong> — {zoneStatus(brakes[0].level).instruction.replace('오늘은 감량 멈춤 — ', '')}</p>
              )}
              {alarms.length > 0 && (
                <div className="noti-preview" aria-label="알림 미리보기">
                  <span className="noti-app">📱 식물환자 · 지금</span>
                  <b>[경보] {alarms[0].name} 소리 {zoneStatus(alarms[0].level).clicks}회/시간</b>
                  <span>지금 바로 관수하세요. 대조 구역 {zoneStatus(alarms[0].level).control}회/시간</span>
                </div>
              )}
              <small>{demoParam || (mail.prefs.enabled && mail.emailOk) ? '📧 메일 알림 발송' : '📧 메일 알림 꺼짐 — 아래 「알림」에서 켜기'} · 출시 시 카톡 알림톡</small>
            </div>
          )}
          <ZoneCards zones={zones} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); document.getElementById('sec-brake')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }) }} />
          <div className="demo-launch">
            <button type="button" className="btn btn-primary" onClick={startDemo} disabled={demo.on && !DEMO_STEPS[demo.step]?.end}>
              🎬 발표 시연 시작 (약 25초)
            </button>
            <span className="hint">감량 → 소리 증가 → 🟠 감량 멈춤 → 🔴 경보 → 복귀{mail.prefs.enabled ? ' · 메일도 실제로 보냅니다' : ''}</span>
          </div>
        </div>

        <ReductionManager zones={zones} selectedId={selectedId} onSelectZone={setSelectedId} onSetLevel={setLevel} />

        <div id="sec-alert" className="anchor">
          <AlertMailCard mail={mail} onTriggerAlarm={triggerAlarm} onResetNormal={resetNormal} presetWhy={presetWhy} />
        </div>

        <HarvestLog zones={zones} />
        <InstallCard area={area} onArea={(v) => setArea(v === '' ? '' : Number(v))} />

        <details id="sec-settings" className="panel settings-wrap anchor" open={settingsOpen} onToggle={(e) => setSettingsOpen(e.currentTarget.open)}>
          <summary>테스트 설정 (입력값) {state.dirty && <span className="dot" aria-label="저장 안 된 변경 있음" />}</summary>
          <p className="hint">1구역의 관수 단계는 여기의 기본 관수량·감량값으로 정해집니다. 실제 센서 값이 아닙니다.</p>
          <SettingsPanel
            state={state}
            showQuality={false}
            onSave={() => announce(state.save())}
            onReset={() => announce(state.reset())}
            onRevert={() => announce(state.revert())}
          />
        </details>
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
        식물환자 · 관수 감량 경보 앱 (시제품) · 센서·관수 장치 연동 준비 중 · <a href="./simulator.html">당도 시뮬레이터</a>
      </footer>
    </div>
  )
}
