import { describe, it, expect, vi } from 'vitest'
import { isValidEmail, buildAlertMessage, shouldSend, formSubmitTransport, mailtoLink, ALERT_KIND } from '../src/api/alertMailer.js'

describe('경보 메일', () => {
  it('메일 주소 검증', () => {
    expect(isValidEmail('a@b.co')).toBe(true)
    expect(isValidEmail('abc')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
  it('본문에 상태·수치·테스트 모드 안내가 들어간다', () => {
    const m = buildAlertMessage({ kind: 'alarm', details: { deficit: 40, clicks: 32, brix: 8.6 }, appUrl: 'https://x/' })
    expect(m.subject).toContain('경보')
    expect(m.body).toContain('관수 감량률: 40%')
    expect(m.body).toContain('32회/시간')
    expect(m.body).toContain('테스트 모드')
    expect(m.body).toContain('https://x/')
  })
  it('꺼져 있으면 보내지 않는다', () => expect(shouldSend({ kind: 'alarm', enabled: false })).toBe(false))
  it('멈춤 신호는 선택했을 때만', () => {
    expect(shouldSend({ kind: 'brake', enabled: true, includeBrake: false })).toBe(false)
    expect(shouldSend({ kind: 'brake', enabled: true, includeBrake: true })).toBe(true)
  })
  it('10분 안에 같은 경보는 다시 보내지 않는다', () => {
    const now = 1_000_000_000
    expect(shouldSend({ kind: 'alarm', enabled: true, lastSent: { alarm: now - 60_000 }, now })).toBe(false)
    expect(shouldSend({ kind: 'alarm', enabled: true, lastSent: { alarm: now - 11 * 60_000 }, now })).toBe(true)
  })
  it('FormSubmit 주소로 POST 한다', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ success: 'true', message: 'The form was submitted successfully.' }) }))
    const r = await formSubmitTransport(fetchImpl)({ to: 'a@b.co', subject: 's', body: 'b' })
    expect(fetchImpl.mock.calls[0][0]).toBe('https://formsubmit.co/ajax/a%40b.co')
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)._subject).toBe('s')
    expect(r.ok).toBe(true)
  })
  it('활성화가 필요하면 안내한다', async () => {
    const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ success: 'false', message: 'This form needs Activation. We\'ve sent you an email containing an \'Activate Form\' link.' }) })
    const r = await formSubmitTransport(fetchImpl)({ to: 'a@b.co', subject: 's', body: 'b' })
    expect(r.needsActivation).toBe(true)
  })
  it('mailto 링크', () => expect(mailtoLink('a@b.co', { subject: '제목', body: '본문' })).toMatch(/^mailto:a%40b\.co\?subject=/))
})
