const { resolve } = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const isDevelopment = process.env.NODE_ENV === 'development'
module.exports = {
  mode: isDevelopment ? 'development' : 'production',
  entry: {
    index: ['babel-polyfill', resolve(__dirname,`./src/${isDevelopment ? 'test' : ''}`)]
  },
  output: {
    path: resolve(__dirname, './dist')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        include: resolve(__dirname, '/src'),
        options: {
          presets: ['env']
        }
      },
      {
        test: /\.scss$/,
        loader: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader']
      }
    ]
  },
  plugins: isDevelopment ? [
    new HtmlWebpackPlugin({
      template: resolve(__dirname,'./src/test/index.html')
    }),
    new webpack.NamedModulesPlugin(),
    new webpack.HotModuleReplacementPlugin()
  ] : [],
  devServer: {
    host: '0.0.0.0',
    port: 8080,
    hot: true,
    disableHostCheck: true,
    contentBase: resolve('./dist')
  }
}