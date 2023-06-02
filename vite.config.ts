import { defineConfig } from 'vite'
import autoprefixer from 'autoprefixer'
import nested from 'postcss-nested'
import simpleVars from 'postcss-simple-vars'

export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 8000,
  },
  css: {
    postcss: {
      plugins: [autoprefixer(), nested(), simpleVars()]
    }
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  assetsInclude: ['**/*.glsl'],
  // esbuild: {
  //   drop: ['console', 'debugger']
  // }
})
