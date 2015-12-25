(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["Pat"] = factory();
	else
		root["Pat"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var config = __webpack_require__(1)
	var Compile = __webpack_require__(2)
	var Watcher = __webpack_require__(18)
	var Directive = __webpack_require__(8)
	var Parser = __webpack_require__(9)
	var _ = __webpack_require__(3)

	var VID = 0

	function vid(){
	  return VID++
	}


	/**
	 * 构造函数
	 * @param {object} options 初始化参数
	 */
	var View = function (options) {

	  //需要绑定的节点，必须
	  this.$el = _.query(options.el)

	  if (("development") != 'production' && (!this.$el || !_.isElement(this.$el) || !(this.$el.nodeType == 11 || this.$el.nodeType == 1))) {
	    _.error('pat need a root el and must be a element or documentFragment')
	  }

	  this.$data = options.data || {}
	  //保存根view,没有的话就是自己
	  this.$rootView = options.rootView ? options.rootView : this
	  //模板，可选
	  this.__template = options.template
	  //有的节点会比较特殊，比如是一个documentFragment，这个时候可能会包装一层。
	  this.__node = options.node
	  //所有指令观察对象
	  this.__watchers = {}
	  //用户自定义的观察对象
	  this.__userWatchers = {}
	  //所有过滤器
	  this.__filters = options.filters || {}
	  //唯一标识
	  this.__vid = vid()

	  //记录初始化时间，debug模式下才会打出来
	  if (("development") != 'production' && this.$rootView == this) {
	    _.time('view[' + this.__vid + ']-init:')
	  }

	  //初始化
	  this._init()

	  if (("development") != 'production' && this.$rootView == this) {
	    _.timeEnd('view[' + this.__vid + ']-init:')
	  }
	}

	//初始化
	View.prototype._init = function() {

	  var el = this.$el
	  var node,child

	  if (this.__template) {

	    this.$el.innerHTML = ''
	    el = document.createDocumentFragment()
	    node = document.createElement('div')
	    node.innerHTML = _.trim(this.__template)
	    while (child = node.firstChild) {
	      el.appendChild(child)
	    }
	  }

	  this.$compile(el)

	  //如果是模板，最后一次性的append到dom里
	  if (this.__template) this.$el.appendChild(el)

	}


	View.prototype.$compile = function(el) {
	  Compile.parseRoot(el,this)
	}

	//开始脏检测，在digest上面再封装一层，可以检测如果当前已有进行中的就延迟执行
	//外部用户使用这个方法，也就是一个rootview去脏检测，如果有其他rootview在digest，就延迟
	View.prototype.$apply = function(fn) {
	  if (View._isDigesting) {
	    setTimeout(_.bind(arguments.callee,this),0)
	    return
	  }

	  View._isDigesting = true
	  //记录脏检测时间，debug模式下才会打出来
	  if (("development") != 'production' && this.$rootView == this) {
	    _.time('view[' + this.__vid + ']-digest:')
	  }

	  fn && fn.call(this)
	  this.$digest()

	  if (("development") != 'production' && this.$rootView == this) {
	    _.timeEnd('view[' + this.__vid + ']-digest:')
	  }

	  View._isDigesting = false

	}

	//开始脏检测，这个方法只有内部可以使用
	View.prototype.$digest = function() {
	  //先检查用户自定义的watcher,这样用户的定义可以先执行完
	  this.__userWatchers && _.each(this.__userWatchers,function(watcher){
	    watcher.check()
	  })

	  this.__watchers && _.each(this.__watchers,function(watcher){
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

	  //如果有托管的node，就直接调用对应的删除方法
	  if (this.__node) {
	    this.__node.remove()
	  }else{
	    destroyRoot ? _.remove(this.$el) : (this.$el.innerHTML = '')
	  }

	  this.$el = null
	  this.$data = null
	  this.$rootView = null
	  this.__node = null
	  this.__template = null
	  this.__watchers = null
	  this.__userWatchers = null
	  this.__filters = null
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

	  if (("development") != 'production' && (!expression || !callback)) {
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

	View._isDigesting = false


	//暴露基本对象接口
	View.Parser = Parser
	View.Directive = Directive
	View.Compile = Compile
	View.Watcher = Watcher



	module.exports = View

/***/ },
/* 1 */
/***/ function(module, exports) {

	



	exports.prefix = 't'
	exports.delimiters = ['{{','}}']
	exports.unsafeDelimiters = ['{{{','}}}']

	exports.debug = false

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(3)
	var Directive = __webpack_require__(8)
	var Watcher = __webpack_require__(18)
	var parser = __webpack_require__(9)
	var parseDirective = parser.parseDirective
	var parseText = parser.parseText
	var parseExpression = parser.parseExpression
	var config = __webpack_require__(1)

	/**
	 * 绑定directive
	 * @param  {object} describe 描述信息
	 */
	function _bindDir(describe) {
	  var dirInstance, watcher, view, value

	  //如果不是debug模式，可以把属性删除了.
	  if (!config.debug && describe.el && describe.el.removeAttribute) {
	    describe.el.removeAttribute(describe.name)
	  }


	  view = describe.view
	  dirInstance = Directive.create(describe)


	  //先去watch池子里找,value可以作为key
	  watcher = view.__watchers[describe.value]

	  if (watcher) {
	    //使用老的watcher，如果是一次性的，就不需要加入对应的指令池
	    if (!describe.oneTime) {
	      watcher.__directives.push(dirInstance)
	    }

	  }else{
	    //新建一个watch
	    watcher = new Watcher(view, describe.expression)
	    //看是不是一次性的，新的watch需要加入view的watch池子
	    if (!describe.oneTime) {
	      watcher.__directives.push(dirInstance)
	      view.__watchers[describe.value] = watcher
	    }
	  }

	  dirInstance.__watcher = watcher
	  //执行绑定
	  dirInstance.bind(describe.args)
	  //todo... 这边获取值可以缓存住,优化
	  value = watcher.getValue()
	  //赋值
	  watcher.last = value
	  //首次自动调用update
	  dirInstance.update(value)

	  return dirInstance
	}

	//解析属性，解析出directive，这个只针对element
	function _compileDirective(el,view,attributes) {
	  var attrs, describe, skipChildren, childNodes,blockDirectiveCount,isCurViewRoot

	  //if (el.hasCompiled) return

	  isCurViewRoot = el === view.$el ? true : false

	  blockDirectiveCount = 0
	  //el.hasCompiled = true
	  attributes = attributes || []

	  var describes = [],blockDescribes = []
	  _.each(attributes,function(attr){

	    //不是directive就返回
	    if (!Directive.isDirective(attr)) return

	    describe = parseDirective(attr)
	    describe.view = view
	    describe.el = el

	    describe.block ? blockDescribes.push(describe) : describes.push(describe)

	  })

	  if (("development") != 'production' && blockDescribes.length > 1 ){
	    _.error('one element can only have one block directive.')
	  }

	  /**
	   * 策略是：
	   * 1. 如果有block并且不是在当前的root上，那么就可以交给子集的block指令去解析，它会负责创建新的view
	   * 2. 如果有block并且是在当前的root上，那么证明block的解析已经由父级view完成，那么只需要解析剩余的其他指令就可以了
	   * 3. 没有block那么就正常解析普通就行。
	   */

	  if (!isCurViewRoot && blockDescribes.length) {
	    //只管第一个block
	    _bindDir(blockDescribes[0])

	    //重置为未处理
	    //el.hasCompiled = false
	    return
	  }

	  //排序，之后去绑定
	  describes.sort(function(a, b) {
	    a = a.priority || 100
	    b = b.priority || 100
	    return a > b ? -1 : a === b ? 0 : 1
	  })

	  _.each(describes,function(des){
	    _bindDir(des)
	  })

	  if (el.hasChildNodes()) {
	    childNodes = _.toArray(el.childNodes)
	    _.each(childNodes, function(child) {
	      exports.parse(child, view)
	    })
	  }
	}


	//解析text情况会很复杂，会支持多个插值，并且多个插值里面都有expression
	function _compileTextNode(el, view) {
	  var tokens, token, text, placeholder

	  tokens = parseText(el.data)

	  if (!(tokens.length === 1 && tokens[0].type === parser.TextTemplateParserTypes.text)) {

	    placeholder = _.createAnchor('text-place-holder')
	    _.replace(el, placeholder)
	    for (var i = 0, len = tokens.length; i < len; i++) {
	      token = tokens[i];
	      text = document.createTextNode(token.value)
	      _.before(text, placeholder)
	      //是插值需要特殊处理，绑定directive
	      if (token.type === parser.TextTemplateParserTypes.binding) {
	        _bindDir({
	          name:'',
	          value:token.value,
	          view: view,
	          expression: parseExpression(token.value),
	          oneTime: token.oneTime,
	          html:token.html,
	          directive: 'textTemplate',
	          el: text
	        })
	      }
	    }
	    _.remove(placeholder)
	  }

	}



	exports.parseRoot = function(el,view){

	  var attrs = null
	  if (view.__node) {
	    attrs = _.toArray(view.__node.attrs)
	  }else{
	    attrs = _.toArray(el.attributes)
	  }

	  //去重,需不需要合并之前的值?
	  //attrs = attrs.concat(el.attributes ? _.toArray(el.attributes) : [])
	  _compileDirective(el,view,attrs)
	}



	exports.parse = function(el,view) {

	  if (!_.isElement(el)) return

	  //对于文本节点采用比较特殊的处理
	  if (el.nodeType == 3 && _.trim(el.data)) {
	    _compileTextNode(el, view)
	  }

	  //编译普通节点
	  if ((el.nodeType == 1) && el.tagName !== 'SCRIPT') {
	    _compileDirective(el, view, _.toArray(el.attributes))
	  }
	}

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * 工具类
	 */


	var _ = {}
	var dom = __webpack_require__(4)
	var lang = __webpack_require__(5)
	var log = __webpack_require__(6)

	var assign = lang.assign
	//mix in
	assign(_,lang)
	assign(_,dom)
	assign(_,log)
	_.Class = __webpack_require__(7)


	module.exports = _





/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	

	var config = __webpack_require__(1)
	var _ = __webpack_require__(5)


	exports.query = function (id) {

	  if (!id) return null

	  if (_.isElement(id)) {
	    return id
	  }

	  if (_.isString(id)) {
	    return document.getElementById(id.replace(/^#/,''))
	  }

	}


	/**
	 * Create an "anchor" for performing dom insertion/removals.
	 * This is used in a number of scenarios:
	 * - fragment instance
	 * - v-html
	 * - v-if
	 * - v-for
	 * - component
	 *
	 * @param {String} content
	 * @param {Boolean} persist - IE trashes empty textNodes on
	 *                            cloneNode(true), so in certain
	 *                            cases the anchor needs to be
	 *                            non-empty to be persisted in
	 *                            templates.
	 * @return {Comment|Text}
	 */

	exports.createAnchor = function (content, persist) {
	  var anchor = config.debug
	    ? document.createComment(content)
	    : document.createTextNode(persist ? ' ' : '')
	  //anchor.__vue_anchor = true
	  return anchor
	}



	/**
	 * Insert el before target
	 *
	 * @param {Element} el
	 * @param {Element} target
	 */

	exports.before = function (el, target) {
	  target.parentNode.insertBefore(el, target)
	}

	/**
	 * Insert el after target
	 *
	 * @param {Element} el
	 * @param {Element} target
	 */

	exports.after = function (el, target) {
	  if (target.nextSibling) {
	    exports.before(el, target.nextSibling)
	  } else {
	    target.parentNode.appendChild(el)
	  }
	}

	/**
	 * Remove el from DOM
	 *
	 * @param {Element} el
	 */

	exports.remove = function (el) {
	  el.parentNode && el.parentNode.removeChild(el)
	}

	/**
	 * Prepend el to target
	 *
	 * @param {Element} el
	 * @param {Element} target
	 */

	exports.prepend = function (el, target) {
	  if (target.firstChild) {
	    exports.before(el, target.firstChild)
	  } else {
	    target.appendChild(el)
	  }
	}

	/**
	 * Replace target with el
	 *
	 * @param {Element} target
	 * @param {Element} el
	 */

	exports.replace = function (target, el) {
	  var parent = target.parentNode
	  if (parent) {
	    parent.replaceChild(el, target)
	  }
	}


	/**
	 * Get and remove an attribute from a node.
	 *
	 * @param {Node} node
	 * @param {String} attr
	 */

	exports.clone = function (node) {
	  return node.cloneNode(true)
	}

/***/ },
/* 5 */
/***/ function(module, exports) {

	
	function _mix(s, p) {
	  for (var key in p) {
	    if (p.hasOwnProperty(key)) {
	      s[key] = p[key]
	    }
	  }
	}
	/**
	 * Simple bind, faster than native
	 *
	 * @param {Function} fn
	 * @param {Object} ctx
	 * @return {Function}
	 */

	exports.bind = function (fn, ctx) {
	  return function (a) {
	    var l = arguments.length
	    return l
	      ? l > 1
	        ? fn.apply(ctx, arguments)
	        : fn.call(ctx, a)
	      : fn.call(ctx)
	  }
	}



	exports.htmlspecialchars = function(str) {

	  if (!exports.isString(str)) return str

	  str = str.replace(/&/g, '&amp;')
	  str = str.replace(/</g, '&lt;')
	  str = str.replace(/>/g, '&gt;')
	  str = str.replace(/"/g, '&quot;')
	  str = str.replace(/'/g, '&#039;')
	  return str
	}

	exports.trim=function(str){
	  return str.replace(/(^\s*)|(\s*$)/g, '')
	}

	exports.toArray = function(arg) {
	  if (!arg) return []
	  return Array.prototype.slice.call(arg) || []
	}

	exports.isArray = function(unknow) {
	  return Object.prototype.toString.call(unknow) === '[object Array]'
	}

	exports.isObject = function( unknow ) {
	  return typeof unknow === "function" || ( typeof unknow === "object" && unknow != null )
	}

	exports.isElement = function(unknow){
	  return unknow && typeof unknow === 'object' && unknow.nodeType && typeof unknow.nodeName === 'string'
	}

	exports.isString = function(unknow){
	  return (Object.prototype.toString.call(unknow) === '[object String]')
	}

	exports.each = function(enumerable, iterator) {

	  if (exports.isArray(enumerable)) {
	    for (var i = 0, len = enumerable.length; i < len; i++) {
	      iterator(enumerable[i], i)
	    }
	  } else if (exports.isObject(enumerable)) {
	    for (var key in enumerable) {
	      iterator(enumerable[key], key)
	    }
	  }

	}


	/**
	 * Mix properties into target object.
	 *
	 * @param {Object} target
	 * @param {Object} from
	 */
	exports.assign = function() {

	  if (arguments.length < 2) return

	  var args = exports.toArray(arguments)
	  var target = args.shift()

	  var source
	  while (source = args.shift()) {
	    _mix(target, source)
	  }

	  return target
	}


	exports.hasKey = function(object,key){
	  for (var _key in object) {
	    if (object.hasOwnProperty(_key) && _key == key) return true
	  }

	  return false
	}



	/**
	 * find the index a value in array
	 * @param  {array} array the array
	 * @param  {string} key   key
	 * @return {number}    index number
	 */
	exports.indexOf = function(array,key){
	  if (array === null) return -1
	  var i = 0, length = array.length
	  for (; i < length; i++) if (array[i] === key) return i
	  return -1
	}

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	var config = __webpack_require__(1)
	var _ = __webpack_require__(5)
	var hasConsole = window.console !== undefined && console.log


	if (true){


	  //daily环境 debug模式下才会打出日志，包括各种信息。如脏检测时间
	  exports.log = function(msg) {
	    if (!hasConsole || !config.debug) return
	    console.log('[pat-info]:' + msg)
	  }


	  exports.time = function(key){
	    this.timeHash = this.timeHash || {}
	    this.timeHash[key] = new Date().getTime()
	  }

	  exports.timeEnd = function(key){
	    if (!this.timeHash[key]) return
	    var duration = new Date().getTime() - this.timeHash[key]
	    exports.log(key+duration+'ms')
	  }


	  //daily环境会打出错误日志，线上环境会忽略掉
	  exports.error = function(str,e) {
	    if (!hasConsole) return

	    str && console.error('[pat-error]:' + str)

	    if (e && e instanceof Error) {
	      console.error('[pat-error]:' + e.stack)
	    }
	  }

	}

/***/ },
/* 7 */
/***/ function(module, exports) {

	var Class = (function() {

	  function _mix(s, p) {
	    for (var key in p) {
	      if (p.hasOwnProperty(key)) {
	        s[key] = p[key]
	      }
	    }
	  }

	  var _extend = function() {
	    //开关 用来使生成原型时,不调用真正的构成流程init
	    this.initPrototype = true
	    var prototype = new this()
	    this.initPrototype = false

	    var items = Array.prototype.slice.call(arguments) || []
	    var item

	    //支持混入多个属性，并且支持{}也支持 Function
	    while (item = items.shift()) {
	      _mix(prototype, item.prototype || item)
	    }
	    var SubClass = function() {
	      if (!SubClass.initPrototype && this.init) {
	        this.init.apply(this, arguments) //调用init真正的构造函数
	      }
	    }

	    // 赋值原型链，完成继承
	    SubClass.prototype = prototype

	    // 改变constructor引用
	    SubClass.prototype.constructor = SubClass

	    // 为子类也添加extend方法
	    SubClass.extend = _extend

	    return SubClass
	  }
	    //超级父类
	  var Class = function() {}
	    //为超级父类添加extend方法
	  Class.extend = _extend

	  return Class
	})()



	module.exports = Class

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	

	var _ = __webpack_require__(3)
	var Class = _.Class
	var parser = __webpack_require__(9)

	DIR_REGX = parser.DIR_REGX
	INTERPOLATION_REGX = parser.INTERPOLATION_REGX

	//基础指令定义
	var directives = {
	  'bind':__webpack_require__(11),
	  'model':__webpack_require__(12),
	  'if':__webpack_require__(13),
	  'unless':__webpack_require__(15),
	  'for':__webpack_require__(16),
	  'textTemplate':__webpack_require__(17)
	}
	var noop = function(){}

	uid = 0

	var Directive = Class.extend({
	  init:function(describe){
	    this.__watcher = null
	    this.describe = describe
	    this.el = describe.el
	    this.view = describe.view
	    this.uid = uid++
	  },
	  //是否需要更新
	  shoudUpdate:function(last,current){
	    return last !== current
	  },
	  bind:noop,
	  unbind:noop,
	  update:noop,
	  destroy:function() {

	    this.unbind()
	    this.__watcher = null
	    this.describe = null
	    this.el = null
	    this.view = null
	    this.uid = null

	  }
	})


	var publicDirectives = {}
	_.each(directives,function(directive,key){
	  //继承出新的directive对象
	  publicDirectives[key] = Directive.extend(directives[key])
	})


	module.exports = {
	  __directives:directives,
	  publics:publicDirectives,
	  create:function(describe){
	    var dirFn = publicDirectives[describe.directive]
	    return new dirFn(describe)
	  },
	  isDirective:function(attr){

	    var name,value,match

	    name = attr.name
	    value = attr.value
	    //没有值的话直接忽略
	    if (!value) return false

	    if (INTERPOLATION_REGX.test(value)) return true

	    match = name.match(DIR_REGX)
	    if (match && match[1] && _.hasKey(directives,match[1].split(':')[0])) return true

	    return false
	  },
	  //新加入一个directive定义
	  newDirective:function(key,options) {
	    directives[key] = options
	    this.publicDirectives[key] = Directive.extend(options)
	  }
	}

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	var config = __webpack_require__(1)
	var _ = __webpack_require__(3)
	var expParser = __webpack_require__(10)

	var prefix = config.prefix

	var delimiters = config.delimiters

	var regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g

	function escapeRegex(str) {
	  return str.replace(regexEscapeRE, '\\$&')
	}

	var dirRegx = new RegExp('^' + prefix + '-([^=]+)')
	var argRegx = /:(.*)$/

	var expressionRegx = /([^|]+)\|?([\sA-Za-z$_]*)/


	var open = escapeRegex(config.delimiters[0])
	var close = escapeRegex(config.delimiters[1])
	var unsafeOpen = escapeRegex(config.unsafeDelimiters[0])
	var unsafeClose = escapeRegex(config.unsafeDelimiters[1])

	var tagRE = new RegExp(
	  unsafeOpen + '(.+?)' + unsafeClose + '|' +
	  open + '(.+?)' + close,
	  'g'
	)

	var htmlRE = new RegExp(
	  '^' + unsafeOpen + '.*' + unsafeClose + '$'
	)

	var interpolationRegx = new RegExp(
	  unsafeOpen + '(.+?)' + unsafeClose + '|' +
	  open + '(.+?)' + close
	)


	//解析指令
	/**
	 * 解析指令，这里分两种情况
	 * 1. 普通属性上的插值指令  id="J_{{name}}"
	 * 2. 指令属性   sk-for="xxx"
	 *
	 * @param  {Attr} attr 属性对象
	 * @return 指令描述
	 *
	 * @example
	 *
	 * sk-bind='test.text'
	 *
	 * {
	 *   expression:'@test.text',
	 *   directive:'bind',
	 *   name:'sk-bind',
	 *   value:'test.text',
	 *   args:[], //参数数组
	 *   oneTime:false, //是否是一次性指令，不会响应数据变化
	 *   html:false, //是否支持html格式，也就是不会被转义
	 *   block:false, //是否是block类型的指令
	 *   isInterpolationRegx: true //是否是插值
	 *
	 * }
	 */
	exports.parseDirective = function(attr) {
	  var name = attr.name
	  var value = attr.value
	  var match, args, tokens, directive, obj


	  //value里面有插值的情况下，就认为是插值属性节点，普通指令不支持插值写法
	  if (interpolationRegx.test(value)) {

	    //如果这个时候还能找到指令需要报错提示，指令不能包括插值，这种情况下优先处理插值
	    if (("development") != 'production' && dirRegx.test(name)) {
	      _.error('{{}} can not use in a directive,otherwise the directive will not compiled.')
	    }

	    tokens = exports.parseText(value)

	    return {
	      name: name,
	      value: value,
	      directive: 'bind',
	      args: [name],
	      oneTime: false,
	      html: false,
	      block:false,
	      expression: exports.token2expression(tokens),
	      isInterpolationRegx: true //标识一下是插值
	    }
	  }

	  directive = name.match(dirRegx)[1]
	  //普通指令解析
	  //普通指令全部转义，全部不是onetime
	  if (argRegx.test(directive)) {
	    obj = directive.split(':')
	    directive = obj[0]
	    args = obj[1] ? obj[1].split('|') : []
	  }


	  var dirOptions = __webpack_require__(8).__directives[directive] || {}

	  return {
	    name: name,
	    value: value,
	    directive: directive,
	    args: args || [],
	    oneTime: false,
	    html: false,
	    block: dirOptions.block,
	    priority: dirOptions.priority,
	    expression: exports.parseExpression(value)
	  }
	}

	/**
	 * 解析表达式,不需要支持太复杂的表达式
	 * @param  {[type]} attr [description]
	 * @return {string}
	 *
	 * @example
	 *
	 *   hello + 1 + "hello" | test
	 *
	 * @return
	 *
	 *   _that.applyFilter('_scope.hello + 1 + "hello"',test),
	 *
	 */
	exports.parseExpression = function(text) {


	  var filterName,body,filterTagIndex



	  filterTagIndex = text.lastIndexOf('|')
	  if (filterTagIndex != -1 && text.charAt(filterTagIndex-1) !== '|') {
	    filterName = _.trim(text.substr(filterTagIndex+1))
	    text = text.substr(0,filterTagIndex)
	  }

	  body = _.trim(expParser.compileExpFns(text))

	  if (filterName) {
	    body = '_that.applyFilter(' + body + ',"' + filterName + '")'
	  }

	  return body
	}


	TextTemplateParserTypes = {
	  text: 0,
	  binding: 1
	}


	/**
	 * 用来解析一段文本，找出普通文本和 插值
	 * @param  {text} text 一段文本
	 * @return {array}    返回一个数组
	 */
	exports.parseText = function(text) {

	  text = text.replace(/\n/g, '')

	  //匹配不到插值说明是普通的，直接返回
	  if (!tagRE.test(text)) {
	    return [{
	      type: TextTemplateParserTypes.text,
	      value: text
	    }]
	  }

	  var tokens = []
	  var lastIndex = tagRE.lastIndex = 0
	  var match, index, html, value, first, oneTime
	  while (match = tagRE.exec(text)) {
	    index = match.index
	      // push text token
	    if (index > lastIndex) {
	      tokens.push({
	        type: TextTemplateParserTypes.text,
	        value: text.slice(lastIndex, index)
	      })
	    }
	    // tag token
	    html = htmlRE.test(match[0])
	    value = html ? match[1] : match[2]
	    first = value.charCodeAt(0)
	    oneTime = first === 42 // *
	    value = oneTime ? value.slice(1) : value
	    tokens.push({
	      type: TextTemplateParserTypes.binding,
	      value: _.trim(value),
	      html: html,
	      oneTime: oneTime
	    })
	    lastIndex = index + match[0].length
	  }
	  if (lastIndex < text.length) {
	    tokens.push({
	      type: TextTemplateParserTypes.text,
	      value: text.slice(lastIndex)
	    })
	  }

	  return tokens;
	}

	/**
	 * 用来将上面生成的token合成一个expression
	 * @return {[type]} [description]
	 */
	exports.token2expression = function(tokens) {
	  var mergedExpression = []

	  _.each(tokens, function(token) {

	    if (token.type == TextTemplateParserTypes.text) {
	      mergedExpression.push('"' + token.value + '"')
	    } else {
	      mergedExpression.push('(' + exports.parseExpression(token.value) + ')')
	    }
	  })

	  return mergedExpression.join('+')
	}

	exports.INTERPOLATION_REGX = interpolationRegx
	exports.DIR_REGX = dirRegx
	exports.TextTemplateParserTypes = TextTemplateParserTypes

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(3)

	var allowedKeywords =
	  'Math,Date,this,true,false,null,undefined,Infinity,NaN,' +
	  'isNaN,isFinite,decodeURI,decodeURIComponent,encodeURI,' +
	  'encodeURIComponent,parseInt,parseFloat'
	var allowedKeywordsRE =
	  new RegExp('^(' + allowedKeywords.replace(/,/g, '\\b|') + '\\b)')

	// keywords that don't make sense inside expressions
	var improperKeywords =
	  'break,case,class,catch,const,continue,debugger,default,' +
	  'delete,do,else,export,extends,finally,for,function,if,' +
	  'import,in,instanceof,let,return,super,switch,throw,try,' +
	  'var,while,with,yield,enum,await,implements,package,' +
	  'proctected,static,interface,private,public'
	var improperKeywordsRE =
	  new RegExp('^(' + improperKeywords.replace(/,/g, '\\b|') + '\\b)')

	var wsRE = /\s/g
	var newlineRE = /\n/g
	var saveRE = /[\{,]\s*[\w\$_]+\s*:|('[^']*'|"[^"]*")|new |typeof |void /g
	var restoreRE = /"(\d+)"/g
	var pathReplaceRE = /[^\w$\.]([A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*|\['.*?'\]|\[".*?"\])*)/g

	/**
	 * Save / Rewrite / Restore
	 *
	 * When rewriting paths found in an expression, it is
	 * possible for the same letter sequences to be found in
	 * strings and Object literal property keys. Therefore we
	 * remove and store these parts in a temporary array, and
	 * restore them after the path rewrite.
	 */

	var saved = []

	/**
	 * Save replacer
	 *
	 * The save regex can match two possible cases:
	 * 1. An opening object literal
	 * 2. A string
	 * If matched as a plain string, we need to escape its
	 * newlines, since the string needs to be preserved when
	 * generating the function body.
	 *
	 * @param {String} str
	 * @param {String} isString - str if matched as a string
	 * @return {String} - placeholder with index
	 */

	function save (str, isString) {
	  var i = saved.length
	  saved[i] = isString
	    ? str.replace(newlineRE, '\\n')
	    : str
	  return '"' + i + '"'
	}

	/**
	 * Path rewrite replacer
	 *
	 * @param {String} raw
	 * @return {String}
	 */

	function rewrite (raw) {
	  var c = raw.charAt(0)
	  var path = raw.slice(1)
	  if (allowedKeywordsRE.test(path)) {
	    return raw
	  } else {
	    path = path.indexOf('"') > -1
	      ? path.replace(restoreRE, restore)
	      : path
	    return c + '_scope.' + path
	  }
	}

	/**
	 * Restore replacer
	 *
	 * @param {String} str
	 * @param {String} i - matched save index
	 * @return {String}
	 */

	function restore (str, i) {
	  return saved[i]
	}

	/**
	 * Rewrite an expression, prefixing all path accessors with
	 * `scope.` and generate getter/setter functions.
	 *
	 * @param {String} exp
	 * @param {Boolean} needSet
	 * @return {Function}
	 */

	exports.compileExpFns =function(exp, needSet) {
	  if (improperKeywordsRE.test(exp)) {
	    if (true) _.error(
	      'please avoid using reserved keywords in expression: ' + exp
	    )
	  }
	  // reset state
	  saved.length = 0
	  // save strings and object literal keys
	  var body = exp
	    .replace(saveRE, save)
	    .replace(wsRE, '')
	  // rewrite all paths
	  // pad 1 space here becaue the regex matches 1 extra char
	  body = (' ' + body)
	    .replace(pathReplaceRE, rewrite)
	    .replace(restoreRE, restore)

	  return body
	}


/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * bind用来处理属性，不用来处理textnode
	 * 支持参数
	 */

	var _ = __webpack_require__(3)

	module.exports = {
	  priority: 3000,
	  update:function(value){
	    var args,name,skipHtmlEscape
	    args = this.describe.args || []
	    name = args[0]

	    if (!name) {
	      if (true) _.error('can not find the attribute name,check your code。must be t-bind:attributeName="exp"。')
	      return
	    }
	    //不允许存在破坏节点的特殊字符
	    //todo 一些防止xss的处理
	    if (_.isString(value)) {
	      value = value.replace(/</g, '&lt;').replace(/>/g, '&gt;')
	    }

	    if (_.indexOf(['value','checked','selected'],name) !== -1 && name in this.el){
	      this.el[name] = name === 'value'
	        ? (value || '') // IE9 will set input.value to "null" for null...
	        : value
	      return
	    }

	    if (value != null && value !== false) {
	      this.el.setAttribute(name,value)
	    }else{
	      this.el.removeAttribute(name)
	    }

	  }
	}

/***/ },
/* 12 */
/***/ function(module, exports) {

	Util = {
	  bindEvent: (function() {
	    if ('addEventListener' in window) {
	      return function(el, event, handler) {
	        return el.addEventListener(event, handler, false)
	      }
	    }
	    return function(el, event, handler) {
	      return el.attachEvent('on' + event, handler)
	    };
	  })(),
	  unbindEvent: (function() {
	    if ('removeEventListener' in window) {
	      return function(el, event, handler) {
	        return el.removeEventListener(event, handler, false)
	      };
	    }
	    return function(el, event, handler) {
	      return el.detachEvent('on' + event, handler)
	    };
	  })(),
	  getInputValue: function(el) {
	    var o, _i, _len, _results;
	    if (el.type === 'checkbox') {
	      return el.checked;
	    } else if (el.type === 'select-multiple') {
	      _results = [];
	      for (_i = 0, _len = el.length; _i < _len; _i++) {
	        o = el[_i];
	        if (o.selected) {
	          _results.push(o.value)
	        }
	      }
	      return _results
	    } else {
	      return el.value
	    }
	  }
	}


	module.exports = {
	  priority: 3000,
	  bind:function(args) {
	    //添加事件监听
	    var self = this
	    Util.bindEvent(self.el, 'blur', function() {
	      var val = Util.getInputValue(self.el)
	      var key = self.describe.value

	      if (val != self.curValue) {
	        //这边其实有个坑，如果这个t-modle是在一个for循环语句里，这里修改的只会是当前的scope里面的属性值
	        //这样从父级脏检测的话，父级老的值会把当前的值冲掉。就会是没有改变。这个还没想好怎么做
	        self.setValue(key, val)
	        //需要整个rootview脏检测,使用$apply防止脏检测冲突
	        self.view.$rootView.$apply()
	      }
	    })
	  },
	  setValue: function(key, val) {
	    return new Function('$scope', 'return $scope.' + key + '="' + val + '"')(this.view.$data)
	  },
	  update: function(value) {
	    this.curValue = value
	    this.el.value = value
	  },
	  unbind: function() {
	    Util.unbindEvent(this.el, 'blur')
	  }
	}

/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	
	var _ = __webpack_require__(3)
	var Node = __webpack_require__(14)
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

	      this.node.before(this.placeholder)
	      //_.before(this.el,this.placeholder)
	      this.bound = true
	    }

	    if (!value && this.bound == true){

	      this.node.remove()
	      //_.remove(this.el)
	      this.bound = false
	    }
	    //子view开始脏检测
	    this.childView && this.childView.$digest()
	  },
	  unbind:function(){
	    this.childView && this.childView.$destroy()
	    //_.remove(this.placeholder)
	  }
	}

/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	

	/**
	 * 为什么要有这个类？
	 *
	 * 我们平时使用时，都是针对一个element节点操作
	 * 但是当我们使用<template>这种节点时，会针对多个节点同时操作
	 * 所以我们需要做一层封装，用来决定当前这个特殊节点，怎么删除，怎么添加
	 */

	var _ = __webpack_require__(3)

	/**
	 * 支持普通节点，template节点
	 *
	 */

	function Node (el) {

	  this.el = el

	  this.attrs = el.attributes

	  //如果是template,需要特殊处理
	  if (el.tagName && el.tagName.toLowerCase() === 'template') {
	    //chrome下面可以直接拿content就是个documentFragment,ie下待兼容
	    if (this.el.content) {
	      this.el = this.el.content
	    }else{
	      this.el = nodeToFrag(this.el)
	    }
	  }

	  this.isFrag = el instanceof DocumentFragment

	  if (!this.isFrag) {
	    this.initNormal()
	  }else{
	    this.initFragment()
	  }

	}


	//初始化普通节点的几个方法
	Node.prototype.initNormal = function() {

	  var curEl = this.el

	  this.before = function(target){
	    return _.before(curEl,target)
	  }

	  this.after = function(target){
	    return _.after(curEl,target)
	  }

	  this.remove = function(target){
	    return _.remove(curEl,target)
	  }

	  this.clone = function(){
	    return new Node(_.clone(curEl))
	  }
	}
	//初始化特殊节点Fragment的几个方法
	Node.prototype.initFragment = function() {
	  var curEl = this.el
	  this.start = _.createAnchor('frag-start')
	  this.end = _.createAnchor('frag-end')
	  _.prepend(this.start, curEl)
	  curEl.appendChild(this.end)

	  //documentFragment直接可以before
	  this.before = function(target){
	    return _.before(curEl,target)
	  }
	  this.after = function(target){
	    return _.after(curEl,target)
	  }
	  //documentFragment进行remove时比较麻烦，需要特殊处理不少东西
	  //策略是从占位节点开始挨个的删除
	  this.remove = this._fragmentRemove
	  this.clone = this._fragmentClone
	}


	Node.prototype._fragmentRemove = function() {

	  if (!this.start || !this.end) {
	    if (true) _.error('can‘t find a start or end anchor while use fragmentRemove')
	    return
	  }

	  var node = this.start
	  var prevNode
	  while(node != this.end){
	    prevNode = node
	    node = node.nextSibling
	    _.remove(prevNode)
	  }
	  _.remove(this.end)

	}

	Node.prototype._fragmentClone = function(){
	  //各种兼容性问题
	  return new Node(_.clone(this.el))
	}

	function nodeToFrag(el){
	  var frag = document.createDocumentFragment()
	  var child
	  while (child = el.firstChild) {
	    frag.appendChild(child)
	  }
	  return frag
	}


	module.exports = Node


/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	
	var _ = __webpack_require__(3)

	var _if = __webpack_require__(13)

	/**
	 * unless 指令
	 * @type {Object}
	 */
	module.exports = _.assign({},_if,{
	  update:function(value){
	    return _if.update.call(this,!value)
	  }
	})

/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(3)
	var parser = __webpack_require__(9)
	var parseExpression = parser.parseExpression
	var Node = __webpack_require__(14)


	//差异更新的几种类型
	var UPDATE_TYPES = {
	  MOVE_EXISTING: 1,
	  REMOVE_NODE: 2,
	  INSERT_MARKUP: 3
	}

	var KEY_ID = 0

	module.exports = {
	  block: true,
	  priority: 3000,
	  shoudUpdate: function(last, current) {

	    var lazy = this.describe.args[0] == 'lazy' ? true : false
	    //如果设置了lazy属性，for指令只有在整个引用变化了才会重新渲染，
	    if (lazy){
	      return  last !== current
	    }
	    //否则 任何时候都是需要更新的，哪怕两次的值一样，也是需要更新的，因为你要考虑子view的更新
	    return true
	  },
	  bind: function(args) {
	    // for 语句比较特殊，不使用系统生成的expression
	    var inMatch = this.describe.value.match(/(.*) in (.*)/)
	    if (inMatch) {
	      var itMatch = inMatch[1].match(/\((.*),(.*)\)/)
	      if (itMatch) {
	        this.iterator = itMatch[1].trim()
	        this.alias = itMatch[2].trim()
	      } else {
	        this.alias = inMatch[1].trim()
	      }
	      //修改观察者对应的expression
	      this.__watcher.expression = parseExpression(inMatch[2])
	    }

	    if (("development") != 'production' && !this.alias) {
	      _.error('required a alias in for directive')
	    }

	    this.start = _.createAnchor('for-start')
	    this.end = _.createAnchor('for-end')
	    _.replace(this.el, this.end)
	    _.before(this.start, this.end)

	    this.__node = new Node(this.el)

	    this.oldViewMap = {}

	  },
	  _generateKey: function() {
	    return 'key' + KEY_ID++
	  },
	  _generateNewChildren: function(lists) {

	    var newViewMap = {}
	    var oldViewMap = this.oldViewMap
	    var self = this
	    var data,newNode,name
	    var curKey = '__pat_key__'+self.uid
	    var isListsArray = _.isArray(lists)

	    _.each(lists, function(item, key) {

	      name = item[curKey] || key

	      if (oldViewMap[name] && oldViewMap[name].$data[self.alias] === item) {
	        newViewMap[name] = oldViewMap[name]
	        //发现可以复用，就直接更新view就行
	        //当然要注意重新assign父级数据,如果上一级数据变化了，这里才能脏检测到改变
	        _.assign(oldViewMap[name].$data,self.view.$data)
	        //key需要重新赋值
	        if(self.iterator) oldViewMap[name].$data[self.iterator] = key

	        oldViewMap[name].$digest()

	      } else {
	        //否则需要新建新的view
	        data = {}
	        data[self.alias] = item
	        _.assign(data,self.view.$data)

	        if(self.iterator) data[self.iterator] = key

	        newNode = self.__node.clone()
	        //对于数组我们需要生成私有标识，方便diff。对象直接用key就可以了
	        //有点hacky,但是没办法，为了达到最小的更新，需要注入一个唯一的健值。
	        if (isListsArray) {
	          name = self._generateKey()
	          item[curKey] = name
	        }

	        newViewMap[name] = new self.view.constructor({
	          el: newNode.el,
	          node:newNode,
	          data: data,
	          rootView:self.view.$rootView
	        })
	      }

	    })

	    return newViewMap

	  },
	  _diff: function() {

	    var nextIndex = 0 //代表到达的新的节点的index
	    var lastIndex = 0;//代表访问的最后一次的老的集合的位置
	    var prevChild, nextChild
	    var oldViewMap = this.oldViewMap
	    var newViewMap = this.newViewMap

	    var diffQueue = this.diffQueue = []

	    for (name in newViewMap) {

	      if (!newViewMap.hasOwnProperty(name)) {
	        continue
	      }

	      prevChild = oldViewMap && oldViewMap[name];
	      nextChild = newViewMap[name];

	      //相同的话，说明是使用的同一个view,所以我们需要做移动的操作
	      if (prevChild === nextChild) {
	        //添加差异对象，类型：MOVE_EXISTING
	        prevChild._mountIndex < lastIndex && diffQueue.push({
	          name:name,
	          type: UPDATE_TYPES.MOVE_EXISTING,
	          fromIndex: prevChild._mountIndex,
	          toIndex: nextIndex
	        })
	      } else {//如果不相同，说明是新增加的节点
	        //但是如果老的还存在，我们需要把它删除。
	        //这种情况好像没有
	        if (prevChild) {

	          lastIndex = Math.max(prevChild._mountIndex, lastIndex)
	          //添加差异对象，类型：REMOVE_NODE
	          diffQueue.push({
	            name:name,
	            type: UPDATE_TYPES.REMOVE_NODE,
	            fromIndex: prevChild._mountIndex,
	            toIndex: null
	          })
	          //prevChild.$destroy()
	        }

	        //新增加的节点，也组装差异对象放到队列里
	        //添加差异对象，类型：INSERT_MARKUP
	        diffQueue.push({
	          name:name,
	          type: UPDATE_TYPES.INSERT_MARKUP,
	          fromIndex: null,
	          toIndex: nextIndex,
	          markup: nextChild.__node //新增的节点，多一个此属性，表示新节点的dom内容
	        })
	      }

	      //更新mount的index
	      nextChild._mountIndex = nextIndex
	      nextIndex++
	    }

	    //对于老的节点里有，新的节点里没有的那些，也全都删除掉
	    for (name in oldViewMap) {
	      if (oldViewMap.hasOwnProperty(name) && !(newViewMap && newViewMap.hasOwnProperty(name))) {
	        prevChild = oldViewMap && oldViewMap[name]
	        //添加差异对象，类型：REMOVE_NODE
	        diffQueue.push({
	          name:name,
	          type: UPDATE_TYPES.REMOVE_NODE,
	          fromIndex: prevChild._mountIndex,
	          toIndex: null
	        })
	      }
	    }

	  },
	  _patch:function(){
	    var update, updatedIndex, updatedChild
	    var initialChildren = {}
	    var deleteChildren = []
	    var updates = this.diffQueue
	    for (var i = 0; i < updates.length; i++) {
	      update = updates[i];
	      if (update.type === UPDATE_TYPES.MOVE_EXISTING || update.type === UPDATE_TYPES.REMOVE_NODE) {

	        updatedChild = this.oldViewMap[update.name]
	        initialChildren[update.name] = updatedChild.__node
	        //所有需要修改的节点先删除,对于move的，后面再重新插入到正确的位置即可
	        deleteChildren.push(updatedChild)
	      }
	    }
	    //删除所有需要先删除的
	    _.each(deleteChildren, function(child) {
	      child.$destroy()
	    })

	    //再遍历一次，这次处理新增的节点，还有修改的节点这里也要重新插入
	    for (var k = 0; k < updates.length; k++) {
	      update = updates[k];
	      switch (update.type) {
	        case UPDATE_TYPES.INSERT_MARKUP:
	          this._insertChildAt(update.markup, update.toIndex);
	          break;
	        case UPDATE_TYPES.MOVE_EXISTING:
	          this._insertChildAt(initialChildren[update.name], update.toIndex);
	          break;
	        case UPDATE_TYPES.REMOVE_NODE:
	          // 什么都不需要做，因为上面已经帮忙删除掉了
	          break;
	      }
	    }

	  },
	  //用于把一个node插入到指定位置，通过之前的占位节点去找
	  _insertChildAt:function(element,toIndex){
	    var start = this.start
	    var end = this.end

	    var index = -1
	    var node = start
	    var inFragment = false
	    while(node && node !== end){

	      node = node.nextSibling

	      if (_.isElement(node) && node.nodeType==8 && node.data == 'frag-end') {
	        inFragment = false
	      }

	      if (inFragment) continue

	      //遇到特殊的节点，documentFragment,需要特殊计算index
	      if (_.isElement(node) && node.nodeType==8 && node.data == 'frag-start') {
	        inFragment = true
	        continue
	      }
	      //不是element就跳过
	      if (!(_.isElement(node) && node.nodeType==1)) continue

	      index ++

	      if (toIndex == index) {
	        //_.after(element,node)
	        element.before(node)
	        return
	      }
	    }

	    //证明没找到，不够？那就直接放到最后了
	    if (toIndex > index) {
	      element.before(end)
	      //_.before(element,end)
	    }
	  },
	  update: function(lists) {

	    //策略，先删除以前的，再使用最新的，找出最小差异更新
	    //参考reactjs的差异算法
	    this.newViewMap = this._generateNewChildren(lists)

	    this._diff()
	    this._patch()

	    this.oldViewMap = this.newViewMap

	  },
	  unbind: function() {
	    _.each(this.newViewMap,function(view){
	      view.$destroy()
	    })
	  }
	}

/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * 这是非常特殊的一个directive，用来处理文本节点的插值
	 */


	var _ = __webpack_require__(3)



	module.exports = {
	  priority: 3000,
	  bind:function(args) {
	    this.placeholder = _.createAnchor('text-statement')
	    _.replace(this.el,this.placeholder)
	  },
	  update:function(value){
	    //默认情况下都是转义的，但是可以使用{{{}}}渲染html
	    var isHtml = this.describe.html
	    //如果是html需要特殊处理
	    if (isHtml) {
	      this._updateHtml(value)
	    }else{//不是html可以直接简单赋值
	      this._updateText(value)
	    }
	  },
	  _updateHtml:function(value){

	    if (this.prev && this.prev.length > 0) {
	      _.each(this.prev,function(child){
	        _.remove(child)
	      })
	    }

	    var wrap,firstChild

	    wrap = document.createElement("div")
	    wrap.innerHTML = value

	    this.prev = []

	    while(firstChild = wrap.firstChild){
	      this.prev.push(firstChild)
	      _.before(firstChild,this.placeholder)
	    }

	  },
	  _updateText:function(value){

	    if (this.prev) {
	      _.remove(this.prev)
	    }
	    //因为是textNode所以会自动转义
	    this.prev = document.createTextNode(value)
	    _.before(this.prev,this.placeholder)
	  },
	  unbind:function(){

	  }
	}

/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	
	var _ = __webpack_require__(3)


	//观察者
	function Watcher (view,expression,callback) {
	  this.__directives = []
	  this.__view = view
	  this.expression = expression
	  this.callbacks = callback ? [callback] : []
	  this.scope = view.$data
	  this.last = null
	  this.current = null

	}

	Watcher.prototype.applyFilter = function(value,filterName){

	  if (!filterName) return value

	  //从rootview拿filter
	  var filter = this.__view.$rootView.__filters[filterName]
	  if (filter) {
	    return filter.call(this.__view.$rootView,value,this.scope)
	  }
	  return value
	}

	Watcher.prototype.getValue = function(){
	  if (!this.expression) return ''
	  //取值很容易出错，需要给出错误提示
	  try{
	    return new Function('_scope','_that', 'return ' + this.expression)(this.scope,this)
	  }catch(e){
	    if (true) _.log('error when watcher get the value,please check your expression: "' + this.expression + '"' ,e)
	  }

	}

	Watcher.prototype.check = function() {
	  var self = this

	  this.current = this.getValue()

	  this._check(this.last,this.current)

	  if (this.last != this.current) {
	    _.each(this.callbacks,function(callback){
	      callback(self.last,self.current)
	    })
	  }

	  this.last = this.current
	}


	Watcher.prototype._check = function(last,current) {
	  _.each(this.__directives,function(dir){
	    //directive自己判断要不要更新
	    if (dir.shoudUpdate(last,current)) {
	      dir.update && dir.update(current)
	    }
	  })

	}

	Watcher.prototype.destroy = function() {
	  //通知所有的directive销毁
	  _.each(this.__directives,function(dir){
	    dir.destroy && dir.destroy()
	  })

	}




	module.exports = Watcher

/***/ }
/******/ ])
});
;