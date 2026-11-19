import { defineConfig } from 'vite';

// base を相対にしておくと、GitHub Pages のサブパスなどでもそのまま動く。
// assetsInlineLimit: 0 は、字形ごとに分割されたフォントが CSS に埋め込まれて肥大化するのを防ぐ。
export default defineConfig({
  base: './',
  build: { target: 'es2022', sourcemap: false, assetsInlineLimit: 0 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as never);
