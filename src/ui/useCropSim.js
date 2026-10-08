import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { evaluateConditions, stepBrix, periodAtHour, hoursToReach } from '../domain/brixModel.js'

export const SPEEDS = [
  { value: 1, label: '1시간/초' },
  { value: 6, label: '6시간/초' },
  { value: 24, label: '1일/초' },
]
const MAX_HOURS = 24 * 30 // 30일

/**
 * 생육(당도) 시뮬레이션 — 테스트 설정을 조건으로 시간을 흘려 당도 변화를 계산한다.
 * 실제 작물 측정이 아니다.
 */
export function useCropSim(settings) {
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(6)
  const [autoCycle, setAutoCycle] = useState(false)
  const [hours, setHours] = useState(0)
  const [brix, setBrix] = useState(settings.brix)
  const [history, setHistory] = useState([{ h: 0, b: settings.brix }])
  const [goalBrix, setGoalBrix] = useState(7.5)
  const startBrix = useRef(settings.brix)
  const startHour = settings.period === 'night' ? 22 : 10

  // 시작 전에는 설정 당도를 그대로 따른다
  useEffect(() => {
    if (hours === 0 && !running) {
      setBrix(settings.brix)
      startBrix.current = settings.brix
      setHistory([{ h: 0, b: settings.brix }])
    }
  }, [settings.brix, hours, running])

  const periodNow = autoCycle ? periodAtHour(startHour, hours) : settings.period
  const conditions = useMemo(
    () => evaluateConditions({ ...settings, period: periodNow }),
    [settings, periodNow],
  )

  // 진행 루프: 속도에 맞춰 1초에 speed시간씩 — 계산은 ref에서, 화면 상태는 한 번에 갱신
  const condRef = useRef({ settings, autoCycle, startHour })
  condRef.current = { settings, autoCycle, startHour }
  const simRef = useRef({ h: hours, b: brix })
  simRef.current = { h: hours, b: brix }
  useEffect(() => {
    if (!running) return undefined
    const interval = speed <= 8 ? 1000 / speed : 125
    const perTick = speed <= 8 ? 1 : Math.round((speed * interval) / 1000)
    const id = setInterval(() => {
      const { settings: s, autoCycle: ac, startHour: sh } = condRef.current
      let { h, b } = simRef.current
      if (h >= MAX_HOURS) {
        setRunning(false)
        return
      }
      for (let i = 0; i < perTick && h < MAX_HOURS; i += 1) {
        const p = ac ? periodAtHour(sh, h) : s.period
        b = stepBrix(b, evaluateConditions({ ...s, period: p }).target, 1)
        h += 1
      }
      simRef.current = { h, b }
      setHours(h)
      setBrix(b)
      setHistory((hist) => {
        const last = hist[hist.length - 1]
        return h - last.h >= 3 || h >= MAX_HOURS ? [...hist, { h, b }] : hist
      })
    }, interval)
    return () => clearInterval(id)
  }, [running, speed])

  const reset = useCallback(() => {
    setRunning(false)
    setHours(0)
    setBrix(settings.brix)
    startBrix.current = settings.brix
    setHistory([{ h: 0, b: settings.brix }])
  }, [settings.brix])

  // 원하는 당도까지 남은 시간 (현재 조건 유지 가정)
  const eta = useMemo(
    () => hoursToReach({ brix, goal: goalBrix, settings, autoCycle, startHour, elapsed: hours }),
    [brix, goalBrix, settings, autoCycle, startHour, hours],
  )
  const reachedAt = history.find((p) => p.h > 0 && p.b >= goalBrix - 0.05)?.h ?? null

  return {
    goalBrix,
    setGoalBrix,
    eta,
    reachedAt,
    day: hours > 0 ? Math.floor(hours / 24) + 1 : 0,
    running,
    toggle: () => setRunning((r) => !r),
    reset,
    speed,
    setSpeed,
    autoCycle,
    setAutoCycle,
    hours,
    brix,
    startBrix: startBrix.current,
    history,
    conditions,
    periodNow,
    started: hours > 0,
    maxHours: MAX_HOURS,
  }
}

export function formatElapsed(h) {
  const d = Math.floor(h / 24)
  const r = h % 24
  return d ? `${d}일 ${r}시간` : `${r}시간`
}

/** 걸리는 시간 표시: 24시간 미만은 시간, 이상은 일 */
export function formatDuration(h) {
  if (h < 24) return `${h}시간`
  const d = Math.floor(h / 24)
  const r = h % 24
  return r ? `${d}일 ${r}시간` : `${d}일`
}
