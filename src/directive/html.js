/**
 * 这是非常特殊的一个directive，用来处理文本节点的插值
 */


var _ = require('../util')
var elements = require('../elements/index.js')
var Dom = require('../parser/dom.js')

module.exports = {
  block:true,
  priority: 3000,
  bind:function(value) {
    this.update(value)
  },
  update:function(value){
    if (value === undefined || value === null) {
      value = ''
    }
    //compile html 得到一个带有根node的节点,根node就是collection节点
    var el = Dom.transfer(value,true)
    el.parentNode = this.el.parentNode
    //elements
    //var newCollection = elements.createElement('template',{},el.childNodes)
    //把当前节点替换成一个collection节点
    this.el.replace(el)
    this.el = el
  },
  unbind:function(){

  }
}