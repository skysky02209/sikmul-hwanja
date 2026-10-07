import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' : GitHub Pages 하위 경로(/sikmul-hwanja/)에서도 그대로 동작
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, open: false },
  // GitHub Pages: main 브랜치 /docs 폴더를 그대로 게시
  build: { outDir: 'docs', emptyOutDir: true },
  test: { environment: 'node', include: ['tests/**/*.test.js'] },
})
