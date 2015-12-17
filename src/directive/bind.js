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
    //不允许存在破坏节点的特殊字符
    if (_.isString(value)) {
      value = value.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }

    this.el.setAttribute(name,value)

  },
  unbind:function(){
    // var args,id
    // args = this.describe.args || []
    // id = args[0]
    //如果是插值
    // if (this.describe.isInterpolationRegx) {
    //   //设置为原始值
    //   this.el && this.el.setAttribute(id,describe.value)
    // }else{//否则是bind指令,需要把指令写回去
    // }

  }
}