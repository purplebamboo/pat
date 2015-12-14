/**
 * 这是非常特殊的一个directive，用来处理文本节点的插值
 */


var _ = require('../util')



module.exports = {
  priority: 3000,
  bind:function(options) {
  },
  update:function(value){
    //默认情况下都是转义的，但是可以使用{{{}}}跳过
    var skipHtmlEscape = this.describe.html
    this.el.data = skipHtmlEscape ? value : _.htmlspecialchars(value)
  },
  unbind:function(){
  }
}