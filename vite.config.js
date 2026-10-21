import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// base './' : GitHub Pages 하위 경로(/sikmul-hwanja/)에서도 그대로 동작
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, open: false },
  // GitHub Pages: main 브랜치 /docs 폴더를 그대로 게시
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    // 두 페이지: 경보 앱(index.html) + 당도 시뮬레이터(simulator.html)
    rollupOptions: { input: { main: resolve(__dirname, 'index.html'), simulator: resolve(__dirname, 'simulator.html') } },
  },
  test: { environment: 'node', include: ['tests/**/*.test.js'] },
})
