
var path = require('path');
var webpack = require('webpack')


//定义了一些文件夹的路径
var ROOT_PATH = path.resolve(__dirname);
var APP_PATH = path.resolve(ROOT_PATH, 'src');
var BUILD_PATH = path.resolve(ROOT_PATH, 'build');

module.exports = {
  //项目的文件夹 可以直接用文件夹名称 默认会找index.js 也可以确定是哪个文件名字
  entry: APP_PATH,
  //输出的文件名 合并以后的js会命名为dst.js
  output: {
    path: BUILD_PATH,
    filename: '0.1/skynet.js',
    library: 'View',
    libraryTarget: 'umd'
  },
  //添加我们的插件 会自动生成一个html文件
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"development"'
      }
    })
  ]
};