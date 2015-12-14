
var config = require('../config')
var hasConsole = typeof console !== 'undefined'

if (process.env.NODE_ENV !== 'production') {

  //daily环境 debug模式下才会打出日志，包括各种信息。如脏检测时间
  exports.log = function(msg) {
    if (hasConsole && config.debug) {
      console.log('[info]: ' + msg)
    }
  }

  //daily环境下会报出错误
  exports.warn = function(msg,e) {
    if (hasConsole && console.error) {
      console.error('[error]: ' + msg)
      console.error((e || new Error('Warning Stack Trace')).stack)
    }
  }

}else{
  exports.log = exports.warn = function(){}
}