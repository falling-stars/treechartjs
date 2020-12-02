module.exports = {
  env: {
    browser: true,
    es6: true
  },
  extends: [
    'standard'
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  rules: {
    indent: ['error', 2],
    'arrow-parens': 0,
    'generator-star-spacing': 0,
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
    'no-return-assign': 0,
    'no-mixed-operators': 0,
    'no-new': 0,
    'space-before-function-paren': 0,
    'eol-last': 0,
    'no-unused-vars': 0,
    'no-undef': 0,
    'prefer-promise-reject-errors': 0,
    'no-unneeded-ternary': 0,
    'no-trailing-spaces': 0,
    'object-curly-spacing': 0,
    'no-prototype-builtins': 0,
    'template-curly-spacing': 0,
    'no-void': 0
  }
}
