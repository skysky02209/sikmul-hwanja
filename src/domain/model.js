// 재배 환경 데이터 모델 — 화면·제공자·API가 모두 이 정의를 공유한다.
// 실제 센서가 붙으면 같은 필드 이름으로 값만 채우면 된다.

/** 데이터 출처. 'test'는 사용자가 입력한 테스트값, 'sensor'는 실제 장치 측정값. */
export const SOURCE = Object.freeze({
  TEST: 'test',
  SENSOR: 'sensor',
})

export const PERIODS = Object.freeze([
  { value: 'day', label: '낮' },
  { value: 'night', label: '밤' },
])

export const WEATHERS = Object.freeze([
  { value: 'clear', label: '맑음', hint: '해가 떠 있음' },
  { value: 'cloudy', label: '흐림' },
  { value: 'rain', label: '비' },
  { value: 'snow', label: '눈' },
])

/**
 * 숫자 입력 필드 정의. min/max는 입력 검증 범위다.
 * group은 설정 화면의 묶음 구분에 쓰인다.
 */
export const NUMERIC_FIELDS = Object.freeze({
  outsideTemp: { label: '외부 온도', unit: '°C', min: -30, max: 50, step: 0.1, group: 'climate' },
  insideTemp: { label: '내부 온도', unit: '°C', min: -10, max: 50, step: 0.1, group: 'climate' },
  outsideHumidity: { label: '외부 습도', unit: '%', min: 0, max: 100, step: 1, group: 'climate' },
  insideHumidity: { label: '내부 습도', unit: '%', min: 0, max: 100, step: 1, group: 'climate' },
  baseIrrigation: { label: '기본 관수량', unit: 'L/일', min: 0, max: 5000, step: 1, group: 'irrigation' },
  irrigationReduction: { label: '관수 감량값', unit: 'L/일', min: 0, max: 5000, step: 1, group: 'irrigation' },
  brix: { label: '당도', unit: '°Bx', min: 0, max: 30, step: 0.1, group: 'quality' },
})

/** 기본 테스트값 (토마토 시설 재배를 가정한 예시값) */
export const DEFAULT_SETTINGS = Object.freeze({
  outsideTemp: 18,
  insideTemp: 24,
  outsideHumidity: 55,
  insideHumidity: 70,
  baseIrrigation: 400,
  irrigationReduction: 40,
  period: 'day',
  weather: 'clear',
  brix: 7.5,
})

export const SETTING_KEYS = Object.freeze(Object.keys(DEFAULT_SETTINGS))

export function labelOf(list, value) {
  return list.find((x) => x.value === value)?.label ?? value
}
