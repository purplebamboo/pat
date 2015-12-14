/**
 * bind用来处理属性，不用来处理textnode
 * 支持参数
 */

var _ = require('../util')

module.exports = {
  priority: 3000,
  bind:function(args) {

  },
  update:function(value){
    var args,name,skipHtmlEscape
    args = this.describe.args || []
    name = args[0]

    if (!name) {
      //todo 报错 找不到需要修改的属性
    }

    //默认情况下都是转义的，但是可以使用{{{}}}跳过
    skipHtmlEscape = this.describe.html
    value = skipHtmlEscape ? value : _.htmlspecialchars(value)

    this.el.setAttribute(name,value)

  },
  unbind:function(){
    var args,id
    args = this.describe.args || []
    id = args[0]
    //如果是插值
    // if (this.describe.isInterpolationRegx) {
    //   //设置为原始值
    //   this.el && this.el.setAttribute(id,describe.value)
    // }else{//否则是bind指令,需要把指令写回去
    // }

  }
}