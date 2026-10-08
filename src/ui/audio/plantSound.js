// 식물 소리 들어보기 — 초음파 '딸깍' 소리를 사람이 들을 수 있게 만든 합성음 (실제 녹음 아님)
// 1시간 동안의 클릭을 5초로 압축해 들려준다.

let ctx = null
let playing = []

function audio() {
  const AC = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

/** 시간당 클릭 수 → 5초 동안 들려줄 클릭 수 */
export function clicksInClip(perHour) {
  return Math.max(1, Math.round(perHour / 2))
}

function clickAt(ac, t) {
  const len = Math.floor(ac.sampleRate * 0.012)
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len / 6))
  const src = ac.createBufferSource()
  src.buffer = buf
  const bp = ac.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2600 + Math.random() * 900
  bp.Q.value = 2
  const g = ac.createGain()
  g.gain.value = 0.9
  src.connect(bp).connect(g).connect(ac.destination)
  src.start(t)
  playing.push(src)
}

export function stopPlantSound() {
  playing.forEach((s) => {
    try { s.stop() } catch { /* 이미 끝남 */ }
  })
  playing = []
}

/** perHour 회/시간 소리를 seconds 초로 압축해 재생. 재생 길이(초)를 돌려준다 */
export function playPlantSound(perHour, seconds = 5) {
  const ac = audio()
  if (!ac) return 0
  stopPlantSound()
  const n = clicksInClip(perHour)
  const t0 = ac.currentTime + 0.1
  for (let i = 0; i < n; i += 1) clickAt(ac, t0 + Math.random() * seconds)
  return seconds
}
