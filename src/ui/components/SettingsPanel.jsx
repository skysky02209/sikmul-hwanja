import { NUMERIC_FIELDS, PERIODS, WEATHERS } from '../../domain/model.js'
import { computeFinalIrrigation } from '../../domain/irrigation.js'

function NumberField({ id, spec, value, error, onChange }) {
  const errId = `${id}-err`
  const hintId = `${id}-hint`
  const num = Number(value)
  const sliderVal = Number.isFinite(num) ? Math.min(spec.max, Math.max(spec.min, num)) : spec.min
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>
        {spec.label} <span className="unit">({spec.unit})</span>
      </label>
      <div className="field-row">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={spec.min}
          max={spec.max}
          step={spec.step}
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={`${hintId}${error ? ` ${errId}` : ''}`}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="range"
          min={spec.min}
          max={spec.max}
          step={spec.step}
          value={sliderVal}
          aria-label={`${spec.label} 슬라이더`}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <p id={hintId} className="hint">
        {spec.min}~{spec.max}
        {spec.unit}
      </p>
      {error && (
        <p id={errId} className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function Segmented({ legend, name, options, value, onChange }) {
  return (
    <fieldset className="segmented">
      <legend>{legend}</legend>
      <div className="seg-row">
        {options.map((o) => (
          <label key={o.value} className={`seg ${value === o.value ? 'on' : ''}`}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>
              {o.label}
              {o.hint && <small> ({o.hint})</small>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default function SettingsPanel({ state, onSave, onReset, onRevert }) {
  const { draft, preview, errors, hasErrors, dirty, hasSaved, update } = state
  const f = (key) => (
    <NumberField key={key} id={`f-${key}`} spec={NUMERIC_FIELDS[key]} value={draft[key]} error={errors[key]} onChange={(v) => update(key, v)} />
  )
  const finalPreview = computeFinalIrrigation(preview.baseIrrigation, preview.irrigationReduction)

  return (
    <section aria-labelledby="set-title" className="panel">
      <h2 id="set-title" className="panel-title">테스트 설정</h2>
      <p className="hint">
        입력한 값은 대시보드에 바로 미리 반영됩니다. 실제 센서 값이 아니라 테스트용 값입니다.
      </p>
      <form
        className="settings"
        onSubmit={(e) => {
          e.preventDefault()
          onSave()
        }}
        noValidate
      >
        <fieldset className="group">
          <legend>온도</legend>
          {f('outsideTemp')}
          {f('insideTemp')}
        </fieldset>
        <fieldset className="group">
          <legend>습도</legend>
          {f('outsideHumidity')}
          {f('insideHumidity')}
        </fieldset>
        <fieldset className="group">
          <legend>관수</legend>
          {f('baseIrrigation')}
          {f('irrigationReduction')}
          <p className="calc" aria-live="polite">
            최종 관수량 = {preview.baseIrrigation} − {preview.irrigationReduction} → <strong>{finalPreview} L/일</strong>
          </p>
        </fieldset>
        <fieldset className="group">
          <legend>환경</legend>
          <Segmented legend="낮 / 밤" name="period" options={PERIODS} value={draft.period} onChange={(v) => update('period', v)} />
          <Segmented legend="날씨" name="weather" options={WEATHERS} value={draft.weather} onChange={(v) => update('weather', v)} />
        </fieldset>
        <fieldset className="group">
          <legend>품질</legend>
          {f('brix')}
        </fieldset>

        <div className="actions">
          <p className="save-state" aria-live="polite">
            {hasErrors ? '잘못 입력된 항목을 고쳐야 저장할 수 있습니다.' : dirty ? '저장하지 않은 변경이 있습니다.' : hasSaved ? '저장된 테스트값과 같습니다.' : '기본 테스트값을 쓰고 있습니다.'}
          </p>
          <div className="btn-row">
            <button type="submit" className="btn btn-primary" disabled={hasErrors || !dirty}>
              저장
            </button>
            <button type="button" className="btn" onClick={onRevert} disabled={!dirty}>
              되돌리기
            </button>
            <button type="button" className="btn btn-ghost" onClick={onReset}>
              초기화
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}
