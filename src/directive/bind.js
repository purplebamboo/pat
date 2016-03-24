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
      return this.el.setAttribute(name,value)
    }

    //对于特殊的值，就算是null或者false，也要正常赋值
    if (_.indexOf(['value', 'checked', 'selected'], name) !== -1){
      return this.el.setAttribute(name,value)
    }

    //最后的情况，对于null,false会直接去掉这个属性
    this.el.removeAttribute(name)

  }
}