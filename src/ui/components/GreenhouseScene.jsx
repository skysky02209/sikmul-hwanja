import { labelOf, WEATHERS, PERIODS } from '../../domain/model.js'

const SKY = {
  day: { clear: ['#8FD3F4', '#DDF2FB'], cloudy: ['#AFC2CC', '#E3EAEE'], rain: ['#7E8F99', '#C9D3D9'], snow: ['#C9D6DE', '#F1F5F8'] },
  night: { clear: ['#0F1E36', '#27406B'], cloudy: ['#1D2733', '#3B4652'], rain: ['#151D26', '#2F3A46'], snow: ['#26313D', '#55616E'] },
}

/**
 * 과실(딸기) 모양 — 테스트 설정으로 계산한 당도와 식물환자 판정으로 정한다 (실제 측정 아님)
 * - 당도가 높을수록 과실이 커지고 색이 진해진다
 * - 물이 모자라(멈춤 신호·경보) 스트레스를 받으면 과실이 홀쭉해지고 잎이 처진다
 */
export function fruitLook(brix, signal) {
  const k = Math.min(1, Math.max(0, (brix - 4) / 6)) // 4°Bx → 0, 10°Bx 이상 → 1
  const size = 0.7 + 0.9 * k
  const thin = signal === 'alarm' ? 0.62 : signal === 'brake' ? 0.82 : 1
  const color = signal === 'alarm' ? '#B5654F' : k >= 0.66 ? '#C1121F' : k >= 0.33 ? '#E63946' : '#F28482'
  const label =
    signal === 'alarm' ? '홀쭉 · 물 부족' : signal === 'brake' ? '살짝 홀쭉' : k >= 0.66 ? '통통 · 고당도' : k >= 0.33 ? '보통 · 보통 당도' : '작음 · 저당도'
  const tone = signal === 'alarm' ? 'bad' : signal === 'brake' ? 'warn' : k >= 0.66 ? 'good' : 'neutral'
  return { sx: size * thin, sy: size * (signal === 'alarm' ? 1.05 : 1), color, label, tone, droop: signal === 'alarm' ? 28 : signal === 'brake' ? 12 : 0, wrinkle: signal === 'alarm' }
}

/** 딸기 모양 (cx, cy 중심, 높이 약 22) */
function strawberryPath(cx, cy) {
  return `M${cx} ${cy - 9} C${cx + 10} ${cy - 11} ${cx + 12} ${cy - 1} ${cx + 7} ${cy + 6} C${cx + 4} ${cy + 10} ${cx + 1} ${cy + 13} ${cx} ${cy + 13} C${cx - 1} ${cy + 13} ${cx - 4} ${cy + 10} ${cx - 7} ${cy + 6} C${cx - 12} ${cy - 1} ${cx - 10} ${cy - 11} ${cx} ${cy - 9} Z`
}
const SEEDS = [[-5, -3], [0, -4], [5, -3], [-3, 2], [3, 2], [-5, 6], [0, 6], [5, 6], [-2, 10], [2, 10]]

const FRUIT_TONE = { good: '#17704A', neutral: '#16302B', warn: '#B26A00', bad: '#B3261E' }

/** 온실 단면 그림 — 외부/내부 값과 낮·밤, 날씨, 관수, 과실 상태를 한 장에 보여 준다 */
export default function GreenhouseScene({ s, finalIrrigation, fruitBrix = s.brix, signal = 'continue' }) {
  const fruit = fruitLook(fruitBrix, signal)
  const leaf = signal === 'alarm' ? '#9CAF4A' : signal === 'brake' ? '#6FA544' : '#43A047'
  const anim = { transition: 'transform 0.6s ease, fill 0.6s ease', transformBox: 'fill-box', transformOrigin: 'center' }
  const [top, bottom] = SKY[s.period][s.weather]
  const night = s.period === 'night'
  const txt = night ? '#F1F5F8' : '#16302B'
  const desc = `온실 그림: ${labelOf(PERIODS, s.period)}, ${labelOf(WEATHERS, s.weather)}. 외부 ${s.outsideTemp}°C·${s.outsideHumidity}%, 내부 ${s.insideTemp}°C·${s.insideHumidity}%, 최종 관수량 ${finalIrrigation}L/일. 과실 상태: ${fruit.label}, 당도 ${fruitBrix.toFixed(1)}°Bx.`
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
              <ellipse cx={x - 11} cy="222" rx="12" ry="6" fill={leaf} style={{ ...anim, transformOrigin: 'right center', transform: `rotate(${-fruit.droop}deg)` }} />
              <ellipse cx={x + 11} cy="212" rx="12" ry="6" fill={leaf} style={{ ...anim, transformOrigin: 'left center', transform: `rotate(${fruit.droop}deg)` }} />
              <line x1={x + 4} y1="214" x2={x + 4} y2="226" stroke="#2E7D32" strokeWidth="2" />
              <g style={{ ...anim, transform: `scale(${fruit.sx}, ${fruit.sy})` }}>
                {/* 딸기 */}
                <path d={strawberryPath(x + 4, 237)} fill={fruit.color} style={anim} />
                {SEEDS.map(([dx, dy]) => (
                  <ellipse key={`${dx}${dy}`} cx={x + 4 + dx} cy={237 + dy} rx="0.9" ry="1.3" fill={fruit.wrinkle ? '#D9C27A' : '#F7D774'} />
                ))}
                {fruit.wrinkle && <path d={`M${x} 233 q3 5 1 11 M${x + 8} 233 q-3 5 -1 11`} stroke="#6E2A1E" strokeWidth="1" fill="none" opacity="0.6" />}
                <path d={`M${x + 4} 228 l-6 -1 l4 3 l-3 3 l5 -2 l5 2 l-3 -3 l4 -3 z`} fill="#2E7D32" />
              </g>
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
        {/* 라벨: 과실 상태 */}
        <g>
          <rect x="14" y="200" width="132" height="52" rx="10" fill="rgba(255,255,255,0.9)" stroke={FRUIT_TONE[fruit.tone]} strokeWidth="2" />
          <text x="26" y="220" fontSize="12" fontWeight="700" fill="#16302B">🍓 과실 상태</text>
          <text x="26" y="242" fontSize="13" fontWeight="800" fill={FRUIT_TONE[fruit.tone]}>{fruit.label}</text>
        </g>
      </svg>
      <figcaption className="scene-cap">테스트값으로 그린 화면입니다 · 실제 온실 영상이 아닙니다 · 과실 크기는 당도(높을수록 크게), 모양은 물 부족 정도(경보면 홀쭉)를 나타냅니다</figcaption>
    </figure>
  )
}
