

/**
 * 用来处理 class
 *
 * t-class:classname="expression"
 * 当expression为true时会 为当前节点增加class 'classname'
 */

var _ = require('../util')

module.exports = {
  priority: 3500,
  bind:function(value){
    this.update(value)
  },
  update:function(value){
    var args,classname
    args = this.describe.args || []
    classname = args[0]

    if (!classname) {
      if (process.env.NODE_ENV != 'production') _.error('can not find the attribute classname,check your code。must be t-class:classname="expression"')
      return
    }

    if (value != null && value !== false) {
      this.el.addClass(classname)
    }else{
      this.el.removeClass(classname)
    }

  }
}