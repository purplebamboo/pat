/**
 * bind用来处理属性，不用来处理textnode
 * 支持参数
 */

var _ = require('../util')

module.exports = {
  priority: 3000,
  update:function(value){
    var args,name,skipHtmlEscape
    args = this.describe.args || []
    name = args[0]

    if (!name) {
      if (process.env.NODE_ENV != 'production') _.error('can not find the attribute name,check your code。must be t-bind:attributeName="exp"。')
      return
    }
    //不允许存在破坏节点的特殊字符
    //todo 一些防止xss的处理
    if (_.isString(value)) {
      value = value.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }

    if (_.indexOf(['value','checked','selected'],name) !== -1 && name in this.el){
      this.el[name] = name === 'value'
        ? (value || '') // IE9 will set input.value to "null" for null...
        : value
      return
    }

    if (value != null && value !== false) {

      this.view.$rootView.fire('beforeUpdateAttribute',this.el,this)
      this.el.setAttribute(name,value)
      this.view.$rootView.fire('afterUpdateAttribute',this.el,name,value,this)

    }else{
      this.el.removeAttribute(name)
    }

  }
}