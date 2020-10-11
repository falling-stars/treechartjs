import scss from 'rollup-plugin-scss'
import postcss from 'rollup-plugin-postcss'
import babel from 'rollup-plugin-babel'
import { uglify } from 'rollup-plugin-uglify'

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/index.js',
    format: 'cjs'
  },
  plugins: [
    scss(),
    postcss({
      extract: true
    }),
    babel(),
    uglify()
  ]
}
