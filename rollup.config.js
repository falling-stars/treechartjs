import scss from 'rollup-plugin-scss'
import postcss from 'rollup-plugin-postcss'
import babel from 'rollup-plugin-babel'
import { terser } from 'rollup-plugin-terser'
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'

const isDev = process.env.NODE_ENV === 'development'

export default {
  input: isDev ? 'test/index.js' : 'src/index.js',
  output: {
    file: 'dist/index.js',
    format: isDev ? 'iife' : 'cjs',
    exports: isDev ? 'auto' : 'default'
  },
  plugins: [scss()].concat(
    isDev
      ? [
        serve({
          contentBase: ['dist', 'test'],
          port: 8080,
          historyApiFallback: 'test/index.html'
        }),
        livereload({ watch: ['dist', 'test'] })
      ]
      : [
        postcss({ extract: true }),
        babel(),
        terser()
      ]
  )
}
