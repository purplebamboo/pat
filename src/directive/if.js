
var _ = require('../util')
/**
 * if 指令，这是一个block会产生自己的scope,自己的view
 * @type {Object}
 */
module.exports = {
  block:true,
  priority: 3000,
  shoudUpdate:function(last,current){
    //if 任何时候都是需要更新的，哪怕两次的值一样，也是需要更新的，因为你要考虑子view的更新
    return true
  },
  bind:function(value) {

    this.oriEl = this.el.clone()
    if (!!value){
      this.childView = new this.view.constructor({
        el:this.el,
        data:this.view.$data,
        skipinject:true,
        rootView:this.view.$rootView
      })

      this.bound = true
    }else{
      //软删除
      this.el.remove(true)
      this.bound = false
    }
  },
  update:function(value){
    //子view先开始脏检测
    //this.childView && this.childView.$digest()
    //if 不能使用watch的简单的对比值，而是看结果是true还是false
    //为true并且 上一次是销毁不是绑定
    if (!!value && this.bound == false) {
      //生成新的view
      var newVdNode = this.oriEl.clone()

      this.childView = new this.view.constructor({
        el:newVdNode,
        skipinject:true,
        data:this.view.$data,
        rootView:this.view.$rootView
      })

      this.el.replace(newVdNode)
      this.el = newVdNode
      this.bound = true
    }

    if (!value && this.bound == true){
      //软删除
      this.el.remove(true)
      this.childView.$destroy()
      this.bound = false
    }

  },
  unbind:function(){
    //this.childView && this.childView.$destroy()
    //_.remove(this.placeholder)
  }
}