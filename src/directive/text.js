/**
 * 这是非常特殊的一个directive，用来处理文本节点的插值
 */


var _ = require('../util')



module.exports = {
  priority: 3000,
  bind:function(value) {
    //对于一次性的节点，不需要做包裹
    if (this.describe.oneTime) {
      this.el.oneTime = true
    }

    this.update(value)
  },
  update:function(value){
    if (value === undefined || value === null) {
      value = ''
    }
    this.el.html(value)
  },
  unbind:function(){

  }
}