
var path = require('path');
var webpack = require('webpack')
var pkg = require('./src/config.js')
var version = pkg.version

//定义了一些文件夹的路径
var ROOT_PATH = path.resolve(__dirname);
var APP_PATH = path.resolve(ROOT_PATH, 'src');
var BUILD_PATH = path.resolve(ROOT_PATH, 'build');


var entryConfig = {}
entryConfig[version] = APP_PATH
entryConfig['latest'] = APP_PATH

module.exports = {
  entry: entryConfig,
  output: {
    path: BUILD_PATH,
    filename: '[name]/pat-min.js',
    library: 'Pat',
    libraryTarget: 'umd'
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"'
      }
    }),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    })
  ]
};