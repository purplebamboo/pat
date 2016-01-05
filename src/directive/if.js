
var _ = require('../util')
var Node = require('../node.js')
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
  bind:function(args) {
    this.bound = false
    this.placeholder = _.createAnchor('if-statement')
    //_.before(this.placeholder,this.el)
    _.replace(this.el,this.placeholder)

    this.__node = new Node(this.el)
  },
  update:function(value){
    //子view先开始脏检测
    this.childView && this.childView.$digest()
    //if 不能使用watch的简单的对比值，而是看结果是true还是false
    //为true并且 上一次是销毁不是绑定
    if (!!value && this.bound == false) {
      //生成新的view
      this.node = this.__node.clone()
      this.childView = new this.view.constructor({
        el:this.node.el,
        node:this.node,
        data:this.view.$data,
        rootView:this.view.$rootView
      })

      this.view.$rootView.fire('beforeAddBlock',[],this)
      this.node.before(this.placeholder)
      this.view.$rootView.fire('afterAddBlock',this.node.allElements(),this)

      //_.before(this.el,this.placeholder)
      this.bound = true
    }

    if (!value && this.bound == true){
      this.view.$rootView.fire('beforeDeleteBlock',this.node.allElements(),this)
      this.node.remove()
      this.view.$rootView.fire('afterDeleteBlock',[],this)

      //_.remove(this.el)
      this.bound = false
    }

  },
  unbind:function(){
    this.childView && this.childView.$destroy()
    //_.remove(this.placeholder)
  }
}