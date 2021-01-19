const isTest = process.env.NODE_ENV === 'test'

const testConfig = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript'
  ]
}

module.exports = isTest
  ? testConfig
  : {
    presets: [
      ['@babel/preset-env', { modules: false }]
    ]
  }
