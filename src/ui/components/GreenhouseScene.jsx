import { labelOf, WEATHERS, PERIODS } from '../../domain/model.js'

const SKY = {
  day: { clear: ['#8FD3F4', '#DDF2FB'], cloudy: ['#AFC2CC', '#E3EAEE'], rain: ['#7E8F99', '#C9D3D9'], snow: ['#C9D6DE', '#F1F5F8'] },
  night: { clear: ['#0F1E36', '#27406B'], cloudy: ['#1D2733', '#3B4652'], rain: ['#151D26', '#2F3A46'], snow: ['#26313D', '#55616E'] },
}

/**
 * 과실(딸기) 모양 — 설정값이 아니라 '생육 예측'의 진행에 따라 바뀐다 (실제 측정 아님)
 * - 예측을 시작하기 전에는 아직 덜 자란 홀쭉한 딸기
 * - 예측을 돌려 당도가 오르면 점점 통통하고 진한 빨강이 된다 (약 3일에 걸쳐 차오름)
 * - 조건이 나빠 당도가 떨어지면 다시 홀쭉해진다
 */
export function fruitLook(brix, hours = 0) {
  const level = Math.min(1, Math.max(0, (brix - 5.5) / 3)) // 5.5°Bx 이하 → 0, 8.5°Bx 이상 → 1
  const p = hours > 0 ? level * Math.min(1, hours / 72) : 0
  const sx = 0.62 + 0.88 * p // 홀쭉 → 통통
  const sy = 0.9 + 0.5 * p
  const color = p >= 0.66 ? '#C1121F' : p >= 0.33 ? '#E63946' : p > 0.1 ? '#F28482' : '#F4A6A6'
  const label = hours === 0 ? '홀쭉 · 예측 전' : level < 0.33 ? '홀쭉 · 당도 낮음' : p >= 0.66 ? '통통 · 고당도' : '차오르는 중'
  const tone = hours > 0 && level < 0.33 ? 'warn' : p >= 0.66 ? 'good' : 'neutral'
  return { sx, sy, color, label, tone, p }
}

/** 딸기 모양 (cx, cy 중심, 높이 약 22) */
function strawberryPath(cx, cy) {
  return `M${cx} ${cy - 9} C${cx + 10} ${cy - 11} ${cx + 12} ${cy - 1} ${cx + 7} ${cy + 6} C${cx + 4} ${cy + 10} ${cx + 1} ${cy + 13} ${cx} ${cy + 13} C${cx - 1} ${cy + 13} ${cx - 4} ${cy + 10} ${cx - 7} ${cy + 6} C${cx - 12} ${cy - 1} ${cx - 10} ${cy - 11} ${cx} ${cy - 9} Z`
}
const SEEDS = [[-5, -3], [0, -4], [5, -3], [-3, 2], [3, 2], [-5, 6], [0, 6], [5, 6], [-2, 10], [2, 10]]

function etaText(h) {
  return h < 24 ? `${h}시간` : `${Math.round((h / 24) * 10) / 10}일`
}

const FRUIT_TONE = { good: '#17704A', neutral: '#16302B', warn: '#B26A00', bad: '#B3261E' }

/** 온실 단면 그림 — 외부/내부 값과 낮·밤, 날씨, 관수, 과실 상태를 한 장에 보여 준다 */
export default function GreenhouseScene({ s, finalIrrigation, fruitBrix = s.brix, simHours = 0, signal = 'continue', sim = null }) {
  const fruit = fruitLook(fruitBrix, simHours)
  const droop = signal === 'alarm' ? 28 : signal === 'brake' ? 12 : 0
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
              <ellipse cx={x - 11} cy="222" rx="12" ry="6" fill={leaf} style={{ ...anim, transformOrigin: 'right center', transform: `rotate(${-droop}deg)` }} />
              <ellipse cx={x + 11} cy="212" rx="12" ry="6" fill={leaf} style={{ ...anim, transformOrigin: 'left center', transform: `rotate(${droop}deg)` }} />
              <line x1={x + 4} y1="214" x2={x + 4} y2="226" stroke="#2E7D32" strokeWidth="2" />
              <g style={{ ...anim, transform: `scale(${fruit.sx}, ${fruit.sy})` }}>
                {/* 딸기 */}
                <path d={strawberryPath(x + 4, 237)} fill={fruit.color} style={anim} />
                {SEEDS.map(([dx, dy]) => (
                  <ellipse key={`${dx}${dy}`} cx={x + 4 + dx} cy={237 + dy} rx="0.9" ry="1.3" fill="#F7D774" />
                ))}
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
          <rect x="10" y="146" width="136" height="112" rx="10" fill="rgba(255,255,255,0.94)" stroke={FRUIT_TONE[fruit.tone]} strokeWidth="2" />
          <text x="22" y="164" fontSize="12" fontWeight="700" fill="#16302B">🍓 과실 상태</text>
          <text x="138" y="164" fontSize="12" fontWeight="800" fill="#17704A" textAnchor="end">{simHours > 0 ? `${Math.floor(simHours / 24) + 1}일째` : '시작 전'}</text>
          <text x="22" y="188" fontSize="20" fontWeight="800" fill={FRUIT_TONE[fruit.tone]}>{fruitBrix.toFixed(1)}°Bx</text>
          <text x="22" y="207" fontSize="12" fontWeight="700" fill={FRUIT_TONE[fruit.tone]}>{fruit.label}</text>
          <line x1="20" x2="138" y1="216" y2="216" stroke="#D3DBD0" />
          {sim && (
            <>
              <text x="22" y="232" fontSize="11" fontWeight="700" fill="#16302B">🎯 목표 {sim.goalBrix.toFixed(1)}°Bx</text>
              <text x="22" y="250" fontSize="12" fontWeight="800" fill={sim.eta.reached ? '#17704A' : '#B3261E'}>
                {sim.eta.reached
                  ? sim.eta.hours === 0
                    ? '✅ 목표 이상'
                    : `약 ${etaText(sim.eta.hours)} 뒤 도달`
                  : `⚠ 도달 어려움 (최대 ${sim.eta.best.toFixed(1)})`}
              </text>
            </>
          )}
        </g>
      </svg>
      <figcaption className="scene-cap">테스트값으로 그린 화면입니다 · 실제 온실 영상이 아닙니다 · 딸기는 처음엔 홀쭉하고, 위 ‘생육 예측’을 돌려 당도가 오르면 통통해집니다 · 잎이 처지면 물 부족입니다</figcaption>
    </figure>
  )
}
