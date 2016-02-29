/**
 * 工具类
 */

var _ = {}
var dom = require('./dom.js')
var lang = require('./lang.js')
var log = require('./log.js')

var assign = lang.assign

assign(_,lang)
assign(_,dom)
assign(_,log)
_.Class = require('./class.js')

module.exports = _



