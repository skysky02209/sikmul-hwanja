import { useMemo } from 'react'
import { labelOf, PERIODS, WEATHERS, SOURCE } from '../../domain/model.js'
import { simulateDay } from '../../domain/simulation.js'
import GreenhouseScene from './GreenhouseScene.jsx'
import TrendChart from './TrendChart.jsx'

const WEATHER_ICON = { clear: '☀️', cloudy: '☁️', rain: '🌧️', snow: '❄️' }

function SourceTag({ source }) {
  return source === SOURCE.SENSOR ? (
    <span className="chip chip-live">센서값</span>
  ) : (
    <span className="chip chip-test">테스트값</span>
  )
}

function brixBand(b) {
  if (b >= 8) return { label: '고당도', cls: 'band-high' }
  if (b >= 6) return { label: '보통', cls: 'band-mid' }
  return { label: '낮음', cls: 'band-low' }
}

export default function Dashboard({ snapshot, settings, onApply }) {
  const { climate, context, irrigation, quality } = snapshot
  const brix = quality.brix.value
  const band = brixBand(brix)
  const sim = useMemo(() => simulateDay(settings), [settings])
  const BRIX_MAX = 15

  return (
    <section aria-labelledby="dash-title" className="panel">
      <h2 id="dash-title" className="panel-title">대시보드</h2>

      {/* 당도 — 핵심 지표 */}
      <article className="card brix-card" aria-labelledby="brix-label">
        <div className="card-head">
          <h3 id="brix-label">당도 (Brix)</h3>
          <SourceTag source={quality.brix.source} />
        </div>
        <p className="brix-value" aria-live="polite">
          <strong>{brix.toFixed(1)}</strong>
          <span className="unit">°Bx</span>
          <span className={`band ${band.cls}`}>{band.label}</span>
        </p>
        <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={BRIX_MAX} aria-valuenow={brix} aria-label="당도 막대">
          <div className="meter-fill" style={{ width: `${Math.min(100, (brix / BRIX_MAX) * 100)}%` }} />
          <span className="meter-mark" style={{ left: `${(6 / BRIX_MAX) * 100}%` }} aria-hidden="true" />
          <span className="meter-mark" style={{ left: `${(8 / BRIX_MAX) * 100}%` }} aria-hidden="true" />
        </div>
        <p className="hint">
          참고 구간(토마토 예시): 6 미만 낮음 · 6~8 보통 · 8 이상 고당도.{' '}
          {quality.brix.source === SOURCE.TEST && '당도 센서가 연결되지 않아 입력한 테스트값을 보여 줍니다.'}
        </p>
      </article>

      <GreenhouseScene s={settings} finalIrrigation={irrigation.final.value} />

      <div className="grid">
        <article className="card">
          <div className="card-head">
            <h3>온도</h3>
            <SourceTag source={climate.insideTemp.source} />
          </div>
          <dl className="pair">
            <div><dt>외부</dt><dd>{climate.outsideTemp.value}<span className="unit">°C</span></dd></div>
            <div><dt>내부</dt><dd>{climate.insideTemp.value}<span className="unit">°C</span></dd></div>
          </dl>
          <p className="hint">내외부 차이 {(climate.insideTemp.value - climate.outsideTemp.value).toFixed(1)}°C</p>
        </article>

        <article className="card">
          <div className="card-head">
            <h3>습도</h3>
            <SourceTag source={climate.insideHumidity.source} />
          </div>
          <dl className="pair">
            <div><dt>외부</dt><dd>{climate.outsideHumidity.value}<span className="unit">%</span></dd></div>
            <div><dt>내부</dt><dd>{climate.insideHumidity.value}<span className="unit">%</span></dd></div>
          </dl>
          <p className="hint">상대습도 기준</p>
        </article>

        <article className="card">
          <div className="card-head">
            <h3>낮 / 밤</h3>
            <SourceTag source={context.period.source} />
          </div>
          <p className="big">
            <span aria-hidden="true">{context.period.value === 'day' ? '🌤️' : '🌙'} </span>
            {labelOf(PERIODS, context.period.value)}
          </p>
        </article>

        <article className="card">
          <div className="card-head">
            <h3>날씨</h3>
            <SourceTag source={context.weather.source} />
          </div>
          <p className="big">
            <span aria-hidden="true">{context.period.value === 'night' && context.weather.value === 'clear' ? '🌙' : WEATHER_ICON[context.weather.value]} </span>
            {labelOf(WEATHERS, context.weather.value)}
          </p>
          {context.weather.value === 'clear' && context.period.value === 'night' && (
            <p className="hint">밤이라 해는 없고 맑은 하늘로 표시합니다.</p>
          )}
        </article>
      </div>

      {/* 관수 */}
      <article className="card irrigation-card" aria-labelledby="irr-title">
        <div className="card-head">
          <h3 id="irr-title">관수</h3>
          <SourceTag source={irrigation.base.source} />
        </div>
        <dl className="irr">
          <div><dt>기본 관수량</dt><dd>{irrigation.base.value}<span className="unit">L/일</span></dd></div>
          <div><dt>관수 감량값</dt><dd>−{irrigation.reduction.value}<span className="unit">L/일</span></dd></div>
          <div className="irr-final"><dt>최종 관수량</dt><dd aria-live="polite">{irrigation.final.value}<span className="unit">L/일</span></dd></div>
        </dl>
        <div className="bar" aria-hidden="true">
          <div className="bar-final" style={{ width: `${100 - irrigation.rate}%` }} />
        </div>
        <p className="hint">
          감량률 {irrigation.rate}%
          {irrigation.clamped && ' · 감량값이 기본 관수량보다 커서 최종 관수량을 0으로 맞췄습니다.'}
        </p>
        <button type="button" className="btn btn-primary btn-block" onClick={onApply}>
          관수 적용 (테스트 모드)
        </button>
      </article>

      <div className="charts">
        <TrendChart
          title="온도 24시간 추이"
          unit="°C"
          nowHour={sim.nowHour}
          series={[
            { name: '내부', color: 'var(--c-green)', values: sim.points.map((p) => p.insideTemp) },
            { name: '외부', color: 'var(--c-blue)', values: sim.points.map((p) => p.outsideTemp) },
          ]}
        />
        <TrendChart
          title="내부 습도 24시간 추이"
          unit="%"
          nowHour={sim.nowHour}
          min={0}
          max={100}
          series={[{ name: '내부 습도', color: 'var(--c-teal)', values: sim.points.map((p) => p.insideHumidity) }]}
        />
      </div>
      <p className="hint center">그래프는 현재 테스트값을 기준으로 만든 예시 추이이며 실제 기록이 아닙니다.</p>
    </section>
  )
}
