var compile = require('./compile.js')
var config = require('./config.js')
var Event = require('./event.js')

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

  //保存根view,没有的话就是自己
  this.$rootView = options.rootView ? options.rootView : this
  //是否需要编译当前根节点（就是当前$el），默认为true。
  this.__rootCompile = options.rootCompile === false ? false : true
  //是否替换整个dom,默认为true
  this.__replace = options.replace
  //所有观察对象
  this.__watchers = {}
  //所有过滤器
  this.__filters = options.filters || []
  //初始化
  this._init()
}

//增加事件机制
//_.extend(View,Event)

//初始化
View.prototype._init = function() {

  if (this.template) {
    //如果有模板，需要先放到页面上去（这里后面也可以放到documentFragmment 或者  virtual dom）
    this.$el.innerHTML = this.template
  }
  this.$compile(this.$el)
}


View.prototype.$compile = function(el) {
  compile.parse(el,this)
}



//开始脏检测，在digest上面再封装一层，可以检测如果当前已有进行中的就延迟执行
// View.prototype.$apply = function(fn) {
//   // if (this._isDigesting) {
//   //   //延迟
//   // }else{
//   // }
//   fn.call(this)
//   _.each(this.__watchers,function(watcher){
//     watcher.check()
//   })
// }

//开始脏检测
View.prototype.$digest = function() {

  if (View._isDigesting) {
    setTimeout(_.bind(arguments.callee,this),0)
    return
  }

  View._isDigesting = true

  _.each(this.__watchers,function(watcher){
    watcher.check()
  })

  View._isDigesting = false

}

//摧毁
View.prototype.$destroy = function() {
  _.each(this.__watchers,function(watcher){
    //通知watch销毁，watch会负责销毁对应的directive
    watcher.destroy()
  })
  //直接清空节点，这样是不是不好，考虑过恢复现场，但是貌似细节太多，处理不过来，先直接清空吧
  if (this.__replace) {
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
 * @return {[type]} [description]
 */
View.config = function(options){
  _.assign(config,options)
}

View._isDigesting = false


module.exports = View