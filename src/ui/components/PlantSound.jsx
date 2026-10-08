import { useEffect, useState } from 'react'
import { clicksInClip, playPlantSound, stopPlantSound } from '../audio/plantSound.js'

const SAMPLES = [
  { id: 'now', label: '지금 상태' },
  { id: 'ok', label: '🟢 물 충분', clicks: 0.6 },
  { id: 'brake', label: '🟠 멈춤', clicks: 6 },
  { id: 'alarm', label: '🔴 경보', clicks: 32 },
]

/** 식물 소리 들어보기 — 합성음으로 클릭 빈도 차이를 귀로 비교 */
export default function PlantSound({ clicks, state }) {
  const [on, setOn] = useState(null)
  useEffect(() => () => stopPlantSound(), [])
  const play = (s) => {
    const c = s.id === 'now' ? clicks : s.clicks
    const sec = playPlantSound(c)
    if (!sec) return
    setOn({ id: s.id, c })
    setTimeout(() => setOn((o) => (o?.id === s.id ? null : o)), sec * 1000 + 200)
  }
  return (
    <div className="plant-sound">
      <strong>🔊 식물 소리 들어보기</strong>
      <div className="btn-row">
        {SAMPLES.map((s) => (
          <button key={s.id} type="button" className={`btn ${on?.id === s.id ? 'btn-primary' : ''}`} onClick={() => play(s)} aria-pressed={on?.id === s.id}>
            {s.id === 'now' ? `▶ ${s.label} (${clicks}회/시간)` : `▶ ${s.label}`}
          </button>
        ))}
      </div>
      <p className="hint">
        {on
          ? `재생 중 — 1시간 동안의 소리(${on.c}회)를 5초로 줄여 ‘딸깍’ ${clicksInClip(on.c)}번으로 들려드립니다.`
          : `물이 모자랄수록 ‘딸깍’ 소리가 잦아집니다. 지금 판정: ${state === 'alarm' ? '경보' : state === 'brake' ? '멈춤 신호' : '정상'}.`}{' '}
        실제 소리는 사람이 못 듣는 초음파(40~80kHz)라, 들을 수 있는 소리로 바꾼 합성음입니다.
      </p>
    </div>
  )
}
