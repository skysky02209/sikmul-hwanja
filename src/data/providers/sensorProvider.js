import { SOURCE } from '../../domain/model.js'

/**
 * 실제 센서 데이터 제공자 — 자리만 마련해 둔 상태다. 현재 연결된 센서는 없다.
 *
 * 연결할 때는 getSnapshot()이 simulationProvider와 같은 모양의 객체를 돌려주되
 * 각 값의 source를 'sensor'로 채우면 된다. (README '장치 연동 구조' 참고)
 */
export class SensorNotConnectedError extends Error {
  constructor() {
    super('실제 센서가 연결되어 있지 않습니다.')
    this.name = 'SensorNotConnectedError'
  }
}

export const sensorProvider = {
  id: 'sensor',
  label: '실제 센서',
  source: SOURCE.SENSOR,
  isConnected: () => false,
  getSnapshot() {
    throw new SensorNotConnectedError()
  },
}
