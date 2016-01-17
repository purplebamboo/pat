/**
 * 这是非常特殊的一个directive，用来处理文本节点的插值
 */


var _ = require('../util')



module.exports = {
  priority: 3000,
  bind:function(args) {
    //this.placeholder = _.createAnchor('text-statement')
    //_.replace(this.el,this.placeholder)
  },
  update:function(value){
    //默认情况下都是转义的，但是可以使用{{{}}}渲染html
    //var isHtml = this.describe.html
    //如果是html需要特殊处理
    //if (isHtml) {
      //this._updateHtml(value)
    //}else{//不是html可以直接简单赋值
      this._updateText(value)
    //}
  },
  _updateHtml:function(value){



    if (this.prev && this.prev.length > 0) {

      this.view.$rootView.fire('beforeDeleteBlock',this.prev,this)

      _.each(this.prev,function(child){
        _.remove(child)
      })

      this.view.$rootView.fire('afterDeleteBlock',[],this)

    }

    var wrap,firstChild

    wrap = document.createElement("div")
    wrap.innerHTML = value

    this.prev = []

    this.view.$rootView.fire('beforeAddBlock',[],this)

    while(firstChild = wrap.firstChild){
      this.prev.push(firstChild)
      _.before(firstChild,this.placeholder)
    }

    this.view.$rootView.fire('afterAddBlock',this.prev,this)

  },
  _updateText:function(value){

    if (this.prev) {
      this.view.$rootView.fire('beforeDeleteBlock',[this.prev],this)

      _.remove(this.prev)

      this.view.$rootView.fire('afterDeleteBlock',[],this)
    }
    //因为是textNode所以会自动转义
    if (value === undefined || value === null) {
      value = ''
    }

    this.prev = document.createTextNode(value)

    this.view.$rootView.fire('beforeAddBlock',[],this)

    _.before(this.prev,this.placeholder)

    this.view.$rootView.fire('afterAddBlock',[this.prev],this)


  },
  unbind:function(){

  }
}