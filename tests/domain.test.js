import { describe, it, expect } from 'vitest'
import { computeFinalIrrigation, reductionRate, isClamped } from '../src/domain/irrigation.js'
import { validateField, validateSettings, sanitizeSettings } from '../src/domain/validate.js'
import { DEFAULT_SETTINGS } from '../src/domain/model.js'
import { runDays, outcomeTable, incomeAt, judge } from '../src/domain/brakeSim.js'
import { simulationProvider } from '../src/data/providers/simulationProvider.js'
import { sensorProvider, SensorNotConnectedError } from '../src/data/providers/sensorProvider.js'
import { getActiveProvider } from '../src/data/providerRegistry.js'
import { getIrrigationController, buildIrrigationPlan } from '../src/api/irrigationController.js'
import { loadSettings, saveSettings, clearSettings, STORAGE_KEY } from '../src/storage/settingsStore.js'
import { simulateDay } from '../src/domain/simulation.js'

describe('관수 계산', () => {
  it('기본 관수량에서 감량값을 뺀다', () => expect(computeFinalIrrigation(400, 40)).toBe(360))
  it('0보다 작아지지 않는다', () => {
    expect(computeFinalIrrigation(100, 250)).toBe(0)
    expect(isClamped(100, 250)).toBe(true)
  })
  it('감량률', () => {
    expect(reductionRate(400, 40)).toBe(10)
    expect(reductionRate(0, 40)).toBe(0)
    expect(reductionRate(100, 250)).toBe(100)
  })
})

describe('입력 검증', () => {
  it('범위 밖 값 거부', () => {
    expect(validateField('insideHumidity', '101').ok).toBe(false)
    expect(validateField('outsideTemp', '-31').ok).toBe(false)
    expect(validateField('brix', '31').ok).toBe(false)
  })
  it('빈 값·문자 거부', () => {
    expect(validateField('brix', '').ok).toBe(false)
    expect(validateField('brix', 'abc').ok).toBe(false)
  })
  it('정상 값 허용', () => expect(validateField('brix', '8.2')).toEqual({ ok: true, value: 8.2 }))
  it('선택값 검증', () => {
    expect(validateField('period', 'night').ok).toBe(true)
    expect(validateField('weather', 'hail').ok).toBe(false)
  })
  it('기본값은 모두 유효', () => expect(validateSettings(DEFAULT_SETTINGS).ok).toBe(true))
  it('손상된 값은 기본값으로 대체', () => expect(sanitizeSettings({ brix: 99, insideTemp: 20 })).toMatchObject({ brix: DEFAULT_SETTINGS.brix, insideTemp: 20 }))
})

describe('데이터 제공자', () => {
  it('시뮬레이션 값은 모두 테스트 출처', () => {
    const s = simulationProvider.getSnapshot(DEFAULT_SETTINGS)
    expect(s.quality.brix.source).toBe('test')
    expect(s.irrigation.final.value).toBe(360)
  })
  it('센서는 연결되지 않음', () => {
    expect(sensorProvider.isConnected()).toBe(false)
    expect(() => sensorProvider.getSnapshot()).toThrow(SensorNotConnectedError)
    expect(getActiveProvider().id).toBe('simulation')
  })
})

describe('관수 장치 API 경계', () => {
  it('테스트 모드는 명령을 보내지 않는다', async () => {
    const c = getIrrigationController()
    const r = await c.apply(buildIrrigationPlan(DEFAULT_SETTINGS))
    expect(c.mode).toBe('test')
    expect(r.sent).toBe(false)
    expect(r.plan.finalLitersPerDay).toBe(360)
  })
})

describe('브라우저 저장', () => {
  const mem = () => {
    const m = new Map()
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }
  }
  it('저장 후 불러오기', () => {
    const st = mem()
    expect(saveSettings({ ...DEFAULT_SETTINGS, brix: 9.1 }, st)).toBe(true)
    expect(loadSettings(st).brix).toBe(9.1)
    clearSettings(st)
    expect(loadSettings(st)).toBeNull()
  })
  it('손상된 JSON은 무시', () => {
    const st = mem()
    st.setItem(STORAGE_KEY, '{oops')
    expect(loadSettings(st)).toBeNull()
  })
})

describe('감량 브레이크 시뮬레이션 (발표자료 수치 재현)', () => {
  it('발표 9쪽 소득을 재현한다', () => {
    expect(incomeAt(100)).toBe(2437)
    expect(incomeAt(80)).toBe(3042)
    expect(incomeAt(70)).toBe(2387)
  })
  it('70%에서 멈춤 신호 → 80%로 한 계단 복귀', () => {
    const { history, stoppedAt } = runDays(5)
    expect(history[3]).toMatchObject({ day: 4, level: 70, state: 'brake' })
    expect(stoppedAt).toBe(80)
    expect(history[4]).toMatchObject({ level: 80, held: true })
  })
  it('60%는 경보', () => expect(judge(60).state).toBe('alarm'))
  it('결과표 5단계', () => expect(outcomeTable()).toHaveLength(5))
})

describe('24시간 추이', () => {
  it('현재 시각에 입력값과 같다', () => {
    const { nowHour, points } = simulateDay(DEFAULT_SETTINGS)
    expect(points).toHaveLength(24)
    expect(points[nowHour].insideTemp).toBe(DEFAULT_SETTINGS.insideTemp)
  })
})
