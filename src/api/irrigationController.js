import { computeFinalIrrigation } from '../domain/irrigation.js'

/**
 * 관수 장치 제어 경계(API boundary).
 *
 * 모든 컨트롤러는 같은 모양을 따른다:
 *   { mode: 'test' | 'device', isConnected(): boolean, apply(plan): Promise<ApplyResult> }
 *
 * ApplyResult = { sent: boolean, mode, plan, message, at }
 *
 * 현재는 테스트 모드 컨트롤러만 있다. 장치에 아무 명령도 보내지 않는다.
 */

/** 화면 설정값으로 관수 계획(장치에 보낼 내용)을 만든다 */
export function buildIrrigationPlan(settings) {
  return {
    baseLitersPerDay: settings.baseIrrigation,
    reductionLitersPerDay: settings.irrigationReduction,
    finalLitersPerDay: computeFinalIrrigation(settings.baseIrrigation, settings.irrigationReduction),
  }
}

export function createTestModeController() {
  return {
    mode: 'test',
    isConnected: () => false,
    async apply(plan) {
      // 의도적으로 네트워크 요청이나 장치 명령을 보내지 않는다.
      return {
        sent: false,
        mode: 'test',
        plan,
        message: '테스트 모드입니다. 관수 장치가 연결되어 있지 않아 명령을 보내지 않았습니다.',
        at: new Date().toISOString(),
      }
    },
  }
}

/** 지금 사용할 컨트롤러. 실제 장치 컨트롤러가 생기면 여기서 연결 여부로 고른다. */
export function getIrrigationController() {
  return createTestModeController()
}
