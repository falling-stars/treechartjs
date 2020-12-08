import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import eslint from '@rollup/plugin-eslint'
import typescript from '@rollup/plugin-typescript'
import postcss from 'rollup-plugin-postcss'
import babel from '@rollup/plugin-babel'
import { terser } from 'rollup-plugin-terser'
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'

const isDev = process.env.NODE_ENV === 'development'

export default {
  input: isDev ? 'dev/index.js' : 'src/store.ts',
  output: {
    dir: 'dist',
    format: isDev ? 'iife' : 'esm'
  },
  external: [/@babel\/runtime/],
  plugins: [
    resolve(),
    commonjs(),
    eslint({
      exclude: ['node_modules/**', 'src/**/*.scss']
    }),
    typescript(),
    postcss()
  ].concat(
    isDev
      ? [
        serve({
          contentBase: ['dist', 'dev'],
          port: 8080,
          historyApiFallback: 'dev/index.html'
        }),
        livereload({ watch: ['dist', 'test'] })
      ]
      : [
        babel({ babelHelpers: 'runtime', plugins: ['@babel/plugin-transform-runtime'] }),
        terser()
      ]
  )
}
