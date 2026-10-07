import { labelOf, WEATHERS, PERIODS } from '../../domain/model.js'

const SKY = {
  day: { clear: ['#8FD3F4', '#DDF2FB'], cloudy: ['#AFC2CC', '#E3EAEE'], rain: ['#7E8F99', '#C9D3D9'], snow: ['#C9D6DE', '#F1F5F8'] },
  night: { clear: ['#0F1E36', '#27406B'], cloudy: ['#1D2733', '#3B4652'], rain: ['#151D26', '#2F3A46'], snow: ['#26313D', '#55616E'] },
}

/** 온실 단면 그림 — 외부/내부 값과 낮·밤, 날씨, 관수를 한 장에 보여 준다 */
export default function GreenhouseScene({ s, finalIrrigation }) {
  const [top, bottom] = SKY[s.period][s.weather]
  const night = s.period === 'night'
  const txt = night ? '#F1F5F8' : '#16302B'
  const desc = `온실 그림: ${labelOf(PERIODS, s.period)}, ${labelOf(WEATHERS, s.weather)}. 외부 ${s.outsideTemp}°C·${s.outsideHumidity}%, 내부 ${s.insideTemp}°C·${s.insideHumidity}%, 최종 관수량 ${finalIrrigation}L/일.`
  return (
    <figure className="scene">
      <svg viewBox="0 0 640 300" role="img" aria-label={desc} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={top} />
            <stop offset="1" stopColor={bottom} />
          </linearGradient>
        </defs>
        <rect width="640" height="300" fill="url(#sky)" />
        {/* 해 / 달 */}
        {s.weather === 'clear' && !night && <circle cx="560" cy="58" r="28" fill="#F2C14E" />}
        {night && (
          <g>
            <circle cx="560" cy="58" r="22" fill="#F1F5F8" />
            <circle cx="571" cy="50" r="20" fill={top} />
          </g>
        )}
        {s.weather !== 'clear' && (
          <g fill={night ? '#5B6773' : '#FFFFFF'} opacity="0.95">
            <ellipse cx="470" cy="62" rx="58" ry="22" />
            <ellipse cx="515" cy="48" rx="38" ry="24" />
            <ellipse cx="420" cy="70" rx="34" ry="16" />
          </g>
        )}
        {s.weather === 'rain' && (
          <g stroke="#3D7FB5" strokeWidth="3" strokeLinecap="round">
            {[420, 445, 470, 495, 520, 545].map((x, i) => (
              <line key={x} x1={x} y1={92 + (i % 2) * 10} x2={x - 6} y2={110 + (i % 2) * 10} />
            ))}
          </g>
        )}
        {s.weather === 'snow' && (
          <g fill="#FFFFFF" stroke="#9FB3C2" strokeWidth="1">
            {[420, 448, 476, 504, 532].map((x, i) => (
              <circle key={x} cx={x} cy={98 + (i % 2) * 14} r="5" />
            ))}
          </g>
        )}
        {/* 땅 */}
        <rect y="262" width="640" height="38" fill={night ? '#2C3A2F' : '#7C9A62'} />
        {/* 온실 */}
        <g>
          <path d="M150 262 V160 L320 96 L490 160 V262 Z" fill={night ? 'rgba(220,235,223,0.18)' : 'rgba(255,255,255,0.55)'} stroke="#17704A" strokeWidth="4" strokeLinejoin="round" />
          <line x1="320" y1="96" x2="320" y2="262" stroke="#17704A" strokeWidth="2" opacity="0.5" />
          <line x1="235" y1="128" x2="235" y2="262" stroke="#17704A" strokeWidth="2" opacity="0.35" />
          <line x1="405" y1="128" x2="405" y2="262" stroke="#17704A" strokeWidth="2" opacity="0.35" />
          {/* 작물 */}
          {[195, 265, 375, 445].map((x) => (
            <g key={x}>
              <line x1={x} y1="258" x2={x} y2="205" stroke="#2E7D32" strokeWidth="4" />
              <ellipse cx={x - 11} cy="222" rx="12" ry="6" fill="#43A047" />
              <ellipse cx={x + 11} cy="212" rx="12" ry="6" fill="#43A047" />
              <circle cx={x + 4} cy="236" r="7" fill="#E53935" />
            </g>
          ))}
          {/* 관수 라인 */}
          <line x1="165" y1="252" x2="475" y2="252" stroke="#2F6DB5" strokeWidth="3" />
          {finalIrrigation > 0 &&
            [195, 265, 375, 445].map((x) => <path key={x} d={`M${x - 14} 252 q3 6 0 9 q-3 -3 0 -9z`} fill="#2F6DB5" />)}
        </g>
        {/* 라벨: 외부 */}
        <g fill={txt} fontFamily="inherit">
          <text x="24" y="36" fontSize="15" fontWeight="700">외부</text>
          <text x="24" y="64" fontSize="26" fontWeight="800">{s.outsideTemp}°C</text>
          <text x="24" y="90" fontSize="16">습도 {s.outsideHumidity}%</text>
        </g>
        {/* 라벨: 내부 */}
        <g fill="#16302B">
          <rect x="256" y="140" width="128" height="58" rx="10" fill="rgba(255,255,255,0.85)" />
          <text x="320" y="162" fontSize="13" fontWeight="700" textAnchor="middle">내부</text>
          <text x="320" y="188" fontSize="20" fontWeight="800" textAnchor="middle">{s.insideTemp}°C · {s.insideHumidity}%</text>
        </g>
        <g fill={night ? '#F1F5F8' : '#16302B'}>
          <text x="625" y="290" fontSize="12" textAnchor="end">관수 {finalIrrigation} L/일</text>
        </g>
      </svg>
      <figcaption className="scene-cap">테스트값으로 그린 화면입니다 · 실제 온실 영상이 아닙니다</figcaption>
    </figure>
  )
}
