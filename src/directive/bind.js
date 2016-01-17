/**
 * bind用来处理属性，不用来处理textnode
 * 支持参数
 */

var _ = require('../util')

module.exports = {
  priority: 3000,
  bind:function(value){
    this.update(value)
  },
  update:function(value){
    var args,name
    args = this.describe.args || []
    name = args[0]

    if (!name) {
      if (process.env.NODE_ENV != 'production') _.error('can not find the attribute name,check your code。must be t-bind:attributeName="exp"。')
      return
    }

    if (value != null && value !== false) {
      this.el.setAttribute(name,value)
    }else{
      this.el.removeAttribute(name)
    }

  }
}