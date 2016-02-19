var config = require('./config.js')
var Compile = require('./compile.js')
var Watcher = require('./watcher/index.js')
var Queue = require('./watcher/queue.js')
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

  //需要绑定的节点，必须,可以是virtual dom
  this.$el = _.query(options.el)

  if (process.env.NODE_ENV != 'production' && !this.$el) {
    _.error('pat need a root el and must be a element or virtual dom')
  }

  this.$data = options.data || {}
  //保存根view,没有的话就是自己
  this.$rootView = options.rootView ? options.rootView : this
  //模板
  this.__template = options.template
  //对于数据是否进行深注入，默认为true,这样当数据已经被注入了get set时，会重新复制一份
  this.__deepinject = options.deepinject == false ? false : true
  //依赖的子view,当此view的一级key更新时，需要同步更新子view的一级key
  this.__dependViews = []
  //所有指令观察对象
  this.__watchers = {}
  //用户自定义的观察对象，不会进入队列，会立即执行
  this.__userWatchers = {}
  //过滤器
  this.__filters = options.filters || {}
  //唯一标识
  this.__vid = options.vid || vid()
  //是否已经渲染到了页面中
  this.__rendered = false

  //记录初始化时间，debug模式下才会打出来
  if (process.env.NODE_ENV != 'production' && this.$rootView == this) {
    _.time('view(' + this.__vid + ')[#' + this.$el.id + ']-init:')
  }

  //初始化
  this._init()

  if (process.env.NODE_ENV != 'production' && this.$rootView == this) {
    _.timeEnd('view(' + this.__vid + ')[#' + this.$el.id + ']-init:')
  }
}

//增加事件机制
_.assign(View.prototype,Event)

//初始化
View.prototype._init = function() {


  var virtualElement = null
  var el = this.$el
  var node,child
  this.fire('beforeMount')

  if (this.$el.__VD__) {
    virtualElement = this.$el
  }else if(this.__template){
    this.$el.innerHTML = ''
    virtualElement = Dom.transfer(this.__template)
  }else{
    virtualElement = Dom.transfer(this.$el.innerHTML)
    this.$el.innerHTML = ''
  }

  //注入get set
  this.$data = this.$inject(this.$data,this.__deepinject)
  //增加特殊联动依赖
  this.__depend()


  this.fire('beforeCompile')
  //开始解析编译虚拟节点
  this.$compile(virtualElement)
  this.fire('afterCompile')

  //如果不是虚拟dom，最后一次性的加到dom里
  //对于非virtualdom的才会fire afterMount事件，其他情况需要自行处理
  if (!this.$el.__VD__){
    this.$el.innerHTML = virtualElement.mountView(this)
    this.__rendered = true//一定要放在事件之前，这样检测才是已经渲染了
    this.fire('afterMount')
  }else{
    this.__rendered = true
  }
}


//增加对一级key的watcher,这样当用户改变了这个值以后，通知子view也去改变这个值。
//达到联动的目的。
//这个主要用在for这种会创建子scope的指令上。
View.prototype.__depend = function(){
  var self = this
  _.each(this.$data.__ori__,function(val,key){
    self.$watch(key,function(){

      if (!self.__dependViews) return
      _.each(self.__dependViews,function(view){
        view.$data[key] = self.$data[key]
      })
    })
  })
}



View.prototype.$inject = function(data,deepinject){
  return Data.inject(data,deepinject)
}

View.prototype.$flushUpdate = function(){
  return Queue.flushUpdate()
}

//为了兼容老的写法
View.prototype.$apply = View.prototype.$flushUpdate


View.prototype.$compile = function(el) {
  Compile.parse(el,this)
}


/**
 * 销毁view
 */
View.prototype.$destroy = function() {
  _.each(this.__watchers,function(watcher){
    //通知watch销毁，watch会负责销毁对应的directive
    //而对于针对的seter getter  会在下次更新时去掉这些引用
    watcher.destroy()
  })

  if (this.$el && this.$el.innerHTML) {
    this.$el.innerHTML = ''
  }

  this.$el = null
  this.$data = null
  this.$rootView = null
  this.__template = null
  this.__watchers = null
  this.__userWatchers = null
  this.__filters = null
  this.isDestroyed = true
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
    watcher.isUserWatcher = true
    this.__userWatchers[expression] = watcher
  }

}

//创建节点接口
View.createElement = Element.createElement
View.createTextNode = Element.createTextNode

//暴露底层对象
View.Parser = Parser
View.Dom = Dom
View.Directive = Directive
View.Compile = Compile
View.Watcher = Watcher
View.Data = Data
View.Element = Element



module.exports = View