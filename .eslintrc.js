module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: [
    'standard'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  plugins: [
    '@typescript-eslint'
  ],
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
    'no-unused-vars': ['error', { vars: 'all', args: 'after-used', ignoreRestSiblings: false }],
    'no-undef': 0,
    'prefer-promise-reject-errors': 0,
    'no-unneeded-ternary': 0,
    'no-trailing-spaces': 0,
    'object-curly-spacing': 0,
    'no-prototype-builtins': 0,
    'template-curly-spacing': 0,
    'no-void': 0,
    'lines-between-class-members': 0
  }
}
