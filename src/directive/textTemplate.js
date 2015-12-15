/**
 * 这是非常特殊的一个directive，用来处理文本节点的插值
 */


var _ = require('../util')



module.exports = {
  priority: 3000,
  bind:function(args) {
    this.placeholder = _.createAnchor('text-statement')
    _.replace(this.el,this.placeholder)
  },
  update:function(value){
    //默认情况下都是转义的，但是可以使用{{{}}}渲染html
    var isHtml = this.describe.html
    //如果是html需要特殊处理
    if (isHtml) {
      this._updateHtml(value)
    }else{//不是html可以直接简单赋值
      this._updateText(value)
    }
  },
  _updateHtml:function(value){

    if (this.prev && this.prev.length > 0) {
      _.each(this.prev,function(child){
        _.remove(child)
      })
    }

    var wrap,childNodes

    wrap = document.createElement("div")
    wrap.innerHTML = value

    this.prev = []
    childNodes = wrap.childNodes

    if (childNodes && childNodes.length > 0) {
      for (var i = childNodes.length - 1 ; i >= 0; i--) {
        this.prev.push(childNodes[i])
        _.before(childNodes[i],this.placeholder)
      }
    }
  },
  _updateText:function(value){

    if (this.prev) {
      _.remove(this.prev)
    }
    //因为是textNode所以会自动转义
    this.prev = document.createTextNode(value)
    _.before(this.prev,this.placeholder)
  },
  unbind:function(){

  }
}