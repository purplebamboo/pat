
var _ = require('../util')

var _if = require('./if.js')

/**
 * unless 指令
 * @type {Object}
 */
module.exports = _.assign({},_if,{
  update:function(value){
    return _if.update.call(this,!value)
  }
})