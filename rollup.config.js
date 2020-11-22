import postcss from 'rollup-plugin-postcss'
import babel from '@rollup/plugin-babel'
import { terser } from 'rollup-plugin-terser'
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'

const isDev = process.env.NODE_ENV === 'development'

export default {
  input: isDev ? 'dev/index.js' : 'src/index.js',
  output: {
    dir: 'dist',
    format: isDev ? 'iife' : 'esm'
  },
  plugins: [postcss()].concat(
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
        babel({ babelHelpers: 'bundled' }),
        terser()
      ]
  )
}
