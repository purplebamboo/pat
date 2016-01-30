var config = require('./config.js')
var Compile = require('./compile.js')
var Watcher = require('./watcher/index.js')
var Directive = require('./directive/index.js')
var Parser = require('./parser/index.js')
var Dom = require('./parser/dom.js')
var Data = require('./data/index.js')
var Element = require('./elements/index.js')
var Event = require('./event')
var _ = require('./util')

var VID = 0


function vid(){
  return VID++
}


/**
 * 构造函数
 * @param {object} options 初始化参数
 */
var View = function (options) {

  //需要绑定的节点，必须,可以是
  this.$el = _.query(options.el)

  if (process.env.NODE_ENV != 'production' && !this.$el) {
    _.error('pat need a root el and must be a element or virtual dom')
  }

  this.$data = options.data || {}
  //保存根view,没有的话就是自己
  this.$rootView = options.rootView ? options.rootView : this
  //模板，可选
  this.__template = options.template
  this.skipinject = options.skipinject
  this.dependViews = []
  //所有指令观察对象
  this.__watchers = {}
  //用户自定义的观察对象
  this.__userWatchers = {}
  //所有过滤器
  this.__filters = options.filters || {}
  //唯一标识
  this.__vid = options.vid || vid()

  //记录初始化时间，debug模式下才会打出来
  if (process.env.NODE_ENV != 'production' && this.$rootView == this) {
    _.time('view[' + this.__vid + ']-init:')
  }

  //初始化
  this._init()

  if (process.env.NODE_ENV != 'production' && this.$rootView == this) {
    _.timeEnd('view[' + this.__vid + ']-init:')
  }
}

//增加事件机制
_.assign(View.prototype,Event)

//初始化
View.prototype._init = function() {

  var el = this.$el
  var node,child
  this.fire('beforeMount')

  if (this.__template) {
    this.$el.innerHTML = ''
    el = Dom.transfer(this.__template)
  }

  if (!this.skipinject) {
    this.$inject()
  }

  this.fire('beforeCompile')
  this.$compile(el)
  this.fire('afterCompile')

  //如果模板，最后一次性的加到dom里
  if (this.__template) this.$el.innerHTML = el.mountView(this)

  this.fire('afterMount')
}

//注入get set
View.prototype.$inject = function(){
  var oriData = this.$data
  this.$data = Data.inject(this.$data)

  //增加对一级key的watcher,这样当用户改变了这个值以后，通知子view也去改变这个值。
  //达到联动的目的
  var self = this
  _.each(oriData,function(val,key){

    self.$watch(key,function(){
      _.each(self.dependViews,function(view){
        view.$data[key] = self.$data[key]
      })

    })
  })

}


View.prototype.$compile = function(el) {
  Compile.parse(el,this)
}

// //开始脏检测，在digest上面再封装一层，可以检测如果当前已有进行中的就延迟执行
// //外部用户使用这个方法，也就是一个rootview去脏检测，如果有其他rootview在digest，就延迟
// View.prototype.$apply = function(fn) {
//   if (View._isDigesting) {
//     setTimeout(_.bind(arguments.callee,this),0)
//     return
//   }

//   View._isDigesting = true
//   //记录脏检测时间，debug模式下才会打出来
//   if (process.env.NODE_ENV != 'production' && this.$rootView == this) {
//     _.time('view[' + this.__vid + ']-digest:')
//   }

//   fn && fn.call(this)
//   this.$digest()

//   if (process.env.NODE_ENV != 'production' && this.$rootView == this) {
//     _.timeEnd('view[' + this.__vid + ']-digest:')
//   }

//   View._isDigesting = false

// }

// //开始脏检测，这个方法只有内部可以使用
// View.prototype.$digest = function() {
//   //先检查用户自定义的watcher,这样用户的定义可以先执行完
//   this.__userWatchers && _.each(this.__userWatchers,function(watcher){
//     watcher.check()
//   })

//   this.__watchers && _.each(this.__watchers,function(watcher){
//     watcher.check()
//   })
// }

/**
 * 销毁view
 * @param  {boolean} destroyRoot 是否销毁绑定的根节点
 */
View.prototype.$destroy = function(destroyRoot) {
  _.each(this.__watchers,function(watcher){
    //通知watch销毁，watch会负责销毁对应的directive
    //而对于针对的seter getter  会在下次更新时去掉这些引用
    watcher.destroy()
  })
  destroyRoot ? _.remove(this.$el) : (this.$el.innerHTML = '')

  // if (this.$el.nodeType == -1) {
  //   this.$el.remove()
  // }

  this.$el = null
  this.$data = null
  this.$rootView = null
  this.__template = null
  this.__watchers = null
  this.__userWatchers = null
  this.__filters = null
  this._destroyed = true
}


/**
 * 用来设置基本配置
 * @return {object} 配置项
 */
View.config = function(options){
  _.assign(config,options)
}

/**
 * 用来添加directive
 * @param {string} key 指令名称
 * @param {object} options 指令定义
 *
 */
View.prototype.$directive = Directive.newDirective

/**
 * 用来添加watch
 * @param {string} expression 一个表达式
 * @param {function} callback 检测到值改变的回调
 */
View.prototype.$watch = function(expression,callback){

  if (process.env.NODE_ENV != 'production' && (!expression || !callback)) {
    _.error('a watch need a expression and callback')
  }

  var watcher

  if (this.__userWatchers[expression]) {
    watcher = this.__userWatchers[expression]
    watcher.callbacks.push(callback)
  }else{
    watcher = new Watcher(this, Parser.parseExpression(expression),callback)
    watcher.last = watcher.getValue()
    this.__userWatchers[expression] = watcher
  }

}


View.createElement = Element.createElement
View.createTextNode = Element.createTextNode




View._isDigesting = false

//暴露基本对象接口
View.Parser = Parser
View.Dom = Dom
View.Directive = Directive
View.Compile = Compile
View.Watcher = Watcher
View.Data = Data
View.Element = Element



module.exports = View