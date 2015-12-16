var compile = require('./compile.js')
var config = require('./config.js')

var _ = require('./util')

//合并数据
var _mergeOptions = function(options){
  //todo  各种特殊属性的合并
  return _.assign({},config.defaultOptions,options)
}

/**
 * 构造函数
 * @param {object} options 初始化参数
 */
var View = function (options) {

  options = _mergeOptions(options)

  //需要绑定的节点，必须
  this.$el = _.query(options.el)
  this.$data = options.data
  this.template = options.template
  //保存根view,没有的话就是自己
  this.$rootView = options.rootView ? options.rootView : this
  //是否需要编译当前根节点（就是当前$el），默认为true。
  this.__rootCompile = options.rootCompile
  //有模版时，是否替换整个dom,默认为true
  this.__replace = options.replace
  //所有观察对象
  this.__watchers = {}
  //所有过滤器
  this.__filters = options.filters || []
  //初始化
  this._init()
}

//初始化
View.prototype._init = function() {

  var el = this.$el
  var node,child

  if (this.template) {
    //看是否需要清空子节点
    if(this.__replace) this.$el.innerHTML = ''

    el = document.createDocumentFragment()
    node = document.createElement('div')
    node.innerHTML = this.template.trim()
    while (child = node.firstChild) {
      el.appendChild(child)
    }
    window.test = el
  }

  this.$compile(el)

  //如果是模板，最后一次性的append到dom里
  if (this.template) this.$el.appendChild(el)

}


View.prototype.$compile = function(el) {
  compile.parse(el,this)
}

//开始脏检测，在digest上面再封装一层，可以检测如果当前已有进行中的就延迟执行
//外部用户使用这个方法，也就是一个rootview去脏检测，如果有其他rootview在digest，就延迟
View.prototype.$apply = function(fn) {
  if (View._isDigesting) {
    setTimeout(_.bind(arguments.callee,this),0)
    return
  }

  View._isDigesting = true

  fn && fn.call(this)
  this.$digest()

  View._isDigesting = false

}

//开始脏检测，这个方法只有内部可以使用
View.prototype.$digest = function() {
  _.each(this.__watchers,function(watcher){
    watcher.check()
  })
}

/**
 * 销毁view
 * @param  {boolean} destroyRoot 是否销毁绑定的根节点
 */
View.prototype.$destroy = function(destroyRoot) {
  _.each(this.__watchers,function(watcher){
    //通知watch销毁，watch会负责销毁对应的directive
    watcher.destroy()
  })

  if (destroyRoot) {
    _.remove(this.$el)
  }else{
    this.$el.innerHTML = ''
  }

  this.$el = null
  this.$data = null
  this.$rootView = null
  this.__rootCompile = null
  this.__replace = null
  this.__watchers = null
  this.__filters = null
}


/**
 * 用来设置基本配置
 * @return {object} 配置项
 */
View.config = function(options){
  _.assign(config,options)
}

View._isDigesting = false


module.exports = View