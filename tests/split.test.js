import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  installPlan, outcomeTable, evaluateConditions, stepBrix, BRIX_FLOOR, DAILY_MAX_CHANGE, zoneStatus, judgeLevel,
} from '../src/domain/sharedModel.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('설치 정보 계산 (가정)', () => {
  it('900평 → 감량 마이크 3대, 대조 1대, 월 30만 원', () => {
    const p = installPlan(900)
    expect(p.reductionMics).toBe(3)
    expect(p.controlMics).toBe(1)
    expect(p.monthlyFee).toBe(30)
  })
  it('300평 → 월 15만 원 (발표자료 20쪽)', () => expect(installPlan(300).monthlyFee).toBe(15))
  it('301평 → 감량 마이크 2대', () => expect(installPlan(301).reductionMics).toBe(2))
  it('0평·잘못된 값은 계산하지 않는다', () => {
    expect(installPlan(0)).toBeNull()
    expect(installPlan('abc')).toBeNull()
  })
})

describe('당도 시뮬레이터 결과 표 (300평, 발표자료와 같은 값)', () => {
  it('표 값이 정확히 같다', () => {
    const want = [
      [100, 6.0, 100, 2437], [90, 6.8, 94, 2777], [80, 7.6, 88, 3042], [70, 8.2, 76, 2387], [60, 8.6, 64, 1731],
    ]
    expect(outcomeTable().map((r) => [r.level, r.brix, r.yieldPct, r.income])).toEqual(want)
  })
})

const BAD = { insideTemp: 34, insideHumidity: 95, baseIrrigation: 400, irrigationReduction: 0, period: 'day', weather: 'rain' }
const GOOD = { insideTemp: 26, insideHumidity: 72, baseIrrigation: 400, irrigationReduction: 100, period: 'day', weather: 'clear' }

describe('당도 모델 — 천천히 변한다', () => {
  it('나쁜 조건 7일 → 하락 2°Bx 이하, 하한(기본 − 0.5) 아래로 내려가지 않음', () => {
    const target = evaluateConditions(BAD).target
    for (const start of [8.4, 7.5, 6.0, 5.4]) {
      const end = stepBrix(start, target, 24 * 7)
      expect(start - end).toBeLessThanOrEqual(2)
      expect(end).toBeGreaterThanOrEqual(Math.min(start, BRIX_FLOOR) - 1e-9)
    }
    // 아주 오래 나빠도 하한 아래로 내려가지 않는다
    expect(stepBrix(8.4, target, 24 * 60)).toBeGreaterThanOrEqual(BRIX_FLOOR - 1e-9)
  })
  it('하루 당도 변화가 ±0.3°Bx를 넘지 않는다', () => {
    expect(DAILY_MAX_CHANGE).toBeLessThanOrEqual(0.3)
    for (const cond of [BAD, GOOD]) {
      const target = evaluateConditions(cond).target
      let b = cond === BAD ? 9 : 4.5
      for (let d = 0; d < 14; d += 1) {
        const next = stepBrix(b, target, 24)
        expect(Math.abs(next - b)).toBeLessThanOrEqual(0.3 + 1e-9)
        b = next
      }
    }
  })
})

describe('구역 상태 (정상 / 감량 멈춤 / 경보)', () => {
  it('80% 정상, 70% 감량 멈춤, 60% 경보', () => {
    expect(judgeLevel(80).name).toBe('정상')
    expect(judgeLevel(70).name).toBe('감량 멈춤')
    expect(judgeLevel(60).name).toBe('경보')
  })
  it('감량 멈춤이면 한 계단 복귀를 지시한다', () => expect(zoneStatus(70).instruction).toBe('오늘은 감량 멈춤 — 80%로 한 계단 복귀'))
})

function files(dir, exts) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p, exts) : exts.some((e) => p.endsWith(e)) ? [p] : []
  })
}

describe('화면 문구 규칙', () => {
  it('화면 텍스트에 "10a", "€", "당도 센서"가 남아 있지 않다 (설명 한 곳 "300평 ≈ 10a(1,000㎡)" 제외)', () => {
    const targets = [
      ...files(join(ROOT, 'src/ui'), ['.jsx', '.js']),
      ...files(join(ROOT, 'src/sim'), ['.jsx', '.js']),
      join(ROOT, 'src/domain/sharedModel.js'),
      join(ROOT, 'index.html'),
      join(ROOT, 'simulator.html'),
    ]
    let allowed = 0
    for (const f of targets) {
      let t = readFileSync(f, 'utf8')
      allowed += t.split('300평 ≈ 10a(1,000㎡)').length - 1
      t = t.replaceAll('300평 ≈ 10a(1,000㎡)', '')
      expect(t, f).not.toMatch(/10a|€|당도 센서/)
    }
    expect(allowed).toBe(1)
  })
})
