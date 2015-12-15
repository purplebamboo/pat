var config = require('../config')
var _ = require('./lang.js')
var hasConsole = window.console !== undefined && console.log

//daily环境 debug模式下才会打出日志，包括各种信息。如脏检测时间
exports.log = function(msg) {

  if (!hasConsole || !config.debug) return
  console.log('[sk-info]:' + msg)
}

//daily环境会打出错误日志，线上环境会忽略掉
exports.error = function(e) {
  if (!hasConsole) return

  if (_.isString(e)) console.error('[sk-error]:' + e)

  if (e instanceof Error) {
    console.error('[sk-error]:' + e.stack)
  }

}

//线上版本忽略所有信息
if (process.env.NODE_ENV == 'production') {
  exports.log = exports.error = function() {}
}