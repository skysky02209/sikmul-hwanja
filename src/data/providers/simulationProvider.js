import { SOURCE } from '../../domain/model.js'
import { computeFinalIrrigation, reductionRate, isClamped } from '../../domain/irrigation.js'

/**
 * 시뮬레이션(테스트) 데이터 제공자.
 * 사용자가 입력한 테스트값을 그대로 '측정값' 형식으로 바꿔 준다.
 * 모든 값의 source는 'test'로 표시된다.
 */
export const simulationProvider = {
  id: 'simulation',
  label: '테스트 데이터 (시뮬레이션)',
  source: SOURCE.TEST,
  isConnected: () => true,

  /** @param {import('../../domain/model.js').DEFAULT_SETTINGS} settings */
  getSnapshot(settings) {
    const tag = (value) => ({ value, source: SOURCE.TEST })
    return {
      providerId: 'simulation',
      takenAt: new Date().toISOString(),
      climate: {
        outsideTemp: tag(settings.outsideTemp),
        insideTemp: tag(settings.insideTemp),
        outsideHumidity: tag(settings.outsideHumidity),
        insideHumidity: tag(settings.insideHumidity),
      },
      context: {
        period: tag(settings.period),
        weather: tag(settings.weather),
      },
      irrigation: {
        base: tag(settings.baseIrrigation),
        reduction: tag(settings.irrigationReduction),
        final: tag(computeFinalIrrigation(settings.baseIrrigation, settings.irrigationReduction)),
        rate: reductionRate(settings.baseIrrigation, settings.irrigationReduction),
        clamped: isClamped(settings.baseIrrigation, settings.irrigationReduction),
      },
      quality: {
        brix: tag(settings.brix),
      },
    }
  },
}
