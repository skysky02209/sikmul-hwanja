// 두 페이지 사이 링크 — 배포마다 바뀌는 번호를 붙여, 브라우저에 남은 예전(없던 시절) 응답을 쓰지 않게 한다
/* global __BUILD_ID__ */
const V = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev'
export const SIM_HREF = `./simulator.html?v=${V}`
export const APP_HREF = `./?v=${V}`
