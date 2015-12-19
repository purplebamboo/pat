var config = require('../config')
var _ = require('./lang.js')
var hasConsole = window.console !== undefined && console.log


if (process.env.NODE_ENV != 'production'){


  //daily环境 debug模式下才会打出日志，包括各种信息。如脏检测时间
  exports.log = function(msg) {
    if (!hasConsole || !config.debug) return
    console.log('[sk-info]:' + msg)
  }


  exports.time = function(key){
    this.timeHash = this.timeHash || {}
    this.timeHash[key] = new Date().getTime()
  }

  exports.timeEnd = function(key){
    if (!this.timeHash[key]) return
    var duration = new Date().getTime() - this.timeHash[key]
    exports.log(key+duration+'ms')
  }


  //daily环境会打出错误日志，线上环境会忽略掉
  exports.error = function(str,e) {
    if (!hasConsole) return

    str && console.error('[sk-error]:' + str)

    if (e && e instanceof Error) {
      console.error('[sk-error]:' + e.stack)
    }
  }

}