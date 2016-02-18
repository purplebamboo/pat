
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
    var self = this

    self.oriEl = self.el.clone()
    if (!!value){
      self.childView = new self.view.constructor({
        el:self.el,
        data:self.view.$data,
        rootView:self.view.$rootView
      })

      if (self.view.__rendered) {
        self.childView.fire('afterMount') //触发事件
      }else{
        self.view.on('afterMount',function(){
          self.childView.fire('afterMount') //触发事件
        })
      }

      self.bound = true
    }else{
      //软删除
      self.el.remove(true)
      self.bound = false
    }
  },
  update:function(value){
    //if 不能使用watch的简单的对比值，而是看结果是true还是false
    if (!!value && this.bound == false) {
      //生成新的view
      var newVdNode = this.oriEl.clone()

      this.childView = new this.view.constructor({
        el:newVdNode,
        //template:newVdNode,
        data:this.view.$data,
        rootView:this.view.$rootView
      })
      this.el.replace(newVdNode)
      this.childView.fire('afterMount') //触发事件

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
    this.childView && this.childView.$destroy()
  }
}