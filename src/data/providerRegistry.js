import { simulationProvider } from './providers/simulationProvider.js'
import { sensorProvider } from './providers/sensorProvider.js'

/**
 * 사용할 데이터 제공자를 고른다.
 * 실제 센서가 연결된 경우에만 sensorProvider를 쓰고, 아니면 시뮬레이션을 쓴다.
 * 현재 sensorProvider.isConnected()는 항상 false다.
 */
export function getActiveProvider() {
  return sensorProvider.isConnected() ? sensorProvider : simulationProvider
}

export const providers = { simulation: simulationProvider, sensor: sensorProvider }
