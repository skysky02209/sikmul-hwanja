// 24시간 시뮬레이션 곡선 — 실제 측정이 아니라 테스트값을 바탕으로 만든 예시 추이다.
// 화면에는 반드시 '시뮬레이션'으로 표시한다.

const WEATHER_SWING = { clear: 1, cloudy: 0.55, rain: 0.4, snow: 0.35 }

/**
 * 현재 테스트값을 기준점으로 0~23시 추이를 만든다.
 * 낮/밤 설정에 맞춰 현재 시각(낮=14시, 밤=2시)에 입력값이 오도록 맞춘다.
 */
export function simulateDay(settings) {
  const swing = WEATHER_SWING[settings.weather] ?? 0.6
  const nowHour = settings.period === 'night' ? 2 : 14
  const wave = (h) => Math.sin(((h - 8) / 24) * Math.PI * 2) // 14시 근처 최고, 2시 근처 최저
  const offset = (h) => wave(h) - wave(nowHour)

  const points = []
  for (let h = 0; h < 24; h += 1) {
    const d = offset(h)
    points.push({
      hour: h,
      outsideTemp: round(settings.outsideTemp + d * 6 * swing),
      insideTemp: round(settings.insideTemp + d * 3 * swing),
      insideHumidity: clamp(round(settings.insideHumidity - d * 10 * swing), 0, 100),
    })
  }
  return { nowHour, points }
}

function round(n) {
  return Math.round(n * 10) / 10
}
function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n))
}
