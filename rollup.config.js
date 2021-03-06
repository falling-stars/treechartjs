import resolve from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'
import commonjs from '@rollup/plugin-commonjs'
import eslint from '@rollup/plugin-eslint'
import typescript from 'rollup-plugin-typescript2'
import postcss from 'rollup-plugin-postcss'
import babel from '@rollup/plugin-babel'
import { DEFAULT_EXTENSIONS } from '@babel/core'
import { terser } from 'rollup-plugin-terser'
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'

const isDev = process.env.NODE_ENV === 'development'
const format = process.env.OUTPUT_FORMAT || 'esm'
const isESM = format === 'esm'

export default {
  input: isDev ? 'dev/index.js' : 'src/index.js',
  output: {
    dir: `dist/${format}`,
    format,
    name: isESM ? undefined : 'TreeChart'
  },
  external: !isDev && isESM ? [/@babel\/runtime/] : [],
  plugins: [
    resolve({ browser: true }),
    json(),
    commonjs(),
    eslint({
      exclude: ['node_modules/**', '**/*.scss', '**/*.json']
    }),
    typescript({ useTsconfigDeclarationDir: true }),
    postcss()
  ].concat(
    isDev
      ? [
        serve({
          contentBase: ['dist', 'dev'],
          port: 8080,
          historyApiFallback: 'dev/index.html'
        }),
        livereload({ watch: ['dist', 'dev'] })
      ]
      : [
        babel({
          babelHelpers: 'runtime',
          exclude: [/node_modules/],
          extensions: [
            ...DEFAULT_EXTENSIONS,
            'ts',
            'tsx'
          ],
          plugins: [
            [
              '@babel/plugin-transform-runtime',
              {
                useESModules: true,
                corejs: 3
              }
            ]
          ]
        }),
        terser()
      ]
  )
}
