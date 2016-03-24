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
	var Watcher = __webpack_require__(19)
	var Queue = __webpack_require__(20)
	var Directive = __webpack_require__(8)
	var Parser = __webpack_require__(9)
	var Dom = __webpack_require__(26)
	var Data = __webpack_require__(18)
	var Element = __webpack_require__(25)
	var Event = __webpack_require__(27)
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

	  //需要绑定的节点，必须,可以是virtual dom
	  this.$el = _.query(options.el)

	  if (("development") != 'production' && !this.$el) {
	    _.error('pat need a root el and must be a element or virtual dom')
	  }

	  //渲染用的数据
	  this.$data = options.data || {}
	  //保存根view,没有的话就是自己
	  this.$rootView = options.rootView ? options.rootView : this
	  //模板
	  this.__template = options.template
	  //对于数据是否进行深注入，默认为false,只对defineProperties模式有效
	  //如果是true那么当数据已经被注入了get set时，会重新复制一份注入
	  this.__deepinject = options.deepinject == true ? true : false
	  //依赖的子view,当此view的一级key更新时，需要同步更新依赖子view的一级key，主要用在for指令那里
	  this.__dependViews = []
	  //所有指令观察对象
	  this.__watchers = {}
	  //用户自定义的观察对象，不会进入队列，会立即执行
	  this.__userWatchers = options.watchers || {}
	  //过滤器
	  this.__filters = options.filters || {}
	  //数据检测方式，支持两种defineProperties dirtyCheck
	  this.__dataCheckType = options.dataCheckType || config.dataCheckType
	  //唯一标识
	  this.__vid = options.vid || vid()
	  //是否已经渲染到了页面中
	  this.__rendered = false

	  //记录初始化时间，debug模式下才会打出来
	  if (("development") != 'production' && this.$rootView == this) {
	    _.time('view-'+this.__dataCheckType+'(' + this.__vid + ')[#' + this.$el.id + ']-init:')
	  }

	  //初始化
	  this._init()

	  if (("development") != 'production' && this.$rootView == this) {
	    _.timeEnd('view-'+this.__dataCheckType+'(' + this.__vid + ')[#' + this.$el.id + ']-init:')
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
	    virtualElement = Dom.transfer(this.__template)
	    this.$el.innerHTML = ''
	  }else{
	    virtualElement = Dom.transfer(this.$el.innerHTML)
	    this.$el.innerHTML = ''
	  }

	  //defineProperties模式下需要进行数据的get set注入
	  if (this.__dataCheckType == 'defineProperties') {
	    //注入get set
	    this.$data = View.$inject(this.$data,this.__deepinject)
	  }

	  //增加特殊联动依赖
	  this.__depend()

	  this.fire('beforeCompile')
	  //开始解析编译虚拟节点
	  this.$compile(virtualElement)
	  this.fire('afterCompile')

	  //如果不是虚拟dom，最后一次性的加到dom里
	  //对于非virtualdom的才会fire afterMount事件，其他情况afterMount事件需要自行处理
	  if (!this.$el.__VD__){
	    this.$el.innerHTML = virtualElement.mountView(this)
	    //this.$el.appendChild(_.string2frag(virtualElement.mountView(this)))
	    this.__rendered = true//一定要放在事件之前，这样检测时才是已经渲染了
	    this.fire('afterMount')
	  }else{
	    //对于virtualdom，只负责compile不负责放到页面，也不负责事件的触发
	    this.__rendered = true
	  }
	}
	//增加对一级key的watcher,这样当用户改变了这个值以后，通知子view也去改变这个值。
	//达到联动的目的。
	//这个主要用在for这种会创建子scope的指令上。
	View.prototype.__depend = function(){
	  var self = this
	  var data = this.$data.__ori__ || this.$data //同时考虑两种检测方式
	  _.each(data,function(val,key){
	    self.__dependWatch(key)
	  })
	}

	View.prototype.__dependWatch = function(key){
	  var self = this

	  self.$watch(key,function(){
	    if (!self.__dependViews) return
	    _.each(self.__dependViews,function(view){
	      view.$data[key] = self.$data[key]
	    })
	  })
	}

	View.$inject = function(data,deepinject){
	  return Data.inject(data,deepinject)
	}

	View.$normalize = function(injectData){
	  return Data.normalize(injectData)
	}

	View.prototype.$nextTick = function(cb,ctx){
	  var ctx = ctx || this
	  return Dom.nextTick(cb,ctx)
	}

	View.prototype.$flushUpdate = function(){
	  return Queue.flushUpdate()
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



	//支持两种检测方式
	//对于defineProperties 就是强制更新
	//对于dirtyCheck 就是开始调用脏检测
	View.prototype.$apply = function(){

	  if (this.__dataCheckType == 'defineProperties') {

	    //todo 打出更新所花时间
	    this.$flushUpdate()
	  }else{

	    if (View._isDigesting) {
	      setTimeout(_.bind(arguments.callee,this),0)
	      return
	    }
	    View._isDigesting = true
	    //记录脏检测时间
	    if (("development") != 'production' && this.$rootView == this) {
	      _.time('view-'+this.__dataCheckType+'(' + this.__vid + ')[#' + this.$el.id + ']-digest:')
	    }
	    this.$digest()

	    if (("development") != 'production' && this.$rootView == this) {
	      _.timeEnd('view-'+this.__dataCheckType+'(' + this.__vid + ')[#' + this.$el.id + ']-digest:')
	    }
	    View._isDigesting = false
	  }

	}


	View.prototype.$compile = function(el) {
	  Compile.parse(el,this)
	}


	/**
	 * 销毁view
	 */
	View.prototype.$destroy = function() {
	  _.each(this.__watchers,function(watcher){
	    //通知watch销毁，watch会负责销毁对应的directive
	    //而对于针对的seter getter会在下次更新时去掉这些watcher引用
	    watcher.destroy()
	  })

	  _.each(this.__userWatchers,function(watcher){
	    //通知自定义的watch销毁
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


	View._isDigesting = false


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
	View.Util = _



	module.exports = View

/***/ },
/* 1 */
/***/ function(module, exports) {

	/**
	 * 指令的前缀
	 *
	 * @type {String}
	 */
	exports.prefix = 't'


	/**
	 * 当前版本号
	 * @type {String}
	 */
	exports.version = '1.1'


	/**
	 * 标识id
	 * @type {String}
	 */
	exports.tagId = 'p-id'


	/**
	 * 普通插值的分割符
	 * @type {Array}
	 */
	exports.delimiters = ['{{','}}']


	/**
	 * html类型的插值分隔符
	 * @type {Array}
	 */
	exports.unsafeDelimiters = ['{{{','}}}']


	/**
	 * for指令的默认key的名称
	 * @type {String}
	 */
	exports.defaultIterator = '__INDEX__'


	/**
	 * 是否开启debug模式，如果开启，在非压缩版本下会打出很多信息。
	 * @type {Boolean}
	 */
	exports.debug = false


	/**
	 * 数据检测方式 支持两种数据变化检测方式 defineProperties dirtyCheck
	 * @type {String}
	 */
	exports.dataCheckType = 'defineProperties'

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(3)
	var Directive = __webpack_require__(8)
	var Data = __webpack_require__(18)
	var Watcher = __webpack_require__(19)
	var parser = __webpack_require__(9)
	var parseDirective = parser.parseDirective
	var parseText = parser.parseText
	var parseExpression = parser.parseExpression
	var config = __webpack_require__(1)


	/**
	 * 绑定directive，初始化指令
	 * @param  {object} describe 描述信息
	 */
	function _bindDir(describe) {
	  var dirInstance, watcher, view, value


	  view = describe.view
	  dirInstance = Directive.create(describe)

	  //先去watch池子里找,value可以作为key
	  watcher = view.__watchers[describe.value]

	  if (!watcher){
	    watcher = new Watcher(view, describe.expression)
	    view.__watchers[describe.value] = watcher
	  }

	  //看是不是一次性的，一次性的不需要加入到watcher的指令池，不需要更新
	  if (!describe.oneTime) {
	    watcher.__directives.push(dirInstance)
	  }

	  dirInstance.__watcher = watcher
	  //执行初始化，如果有的话
	  dirInstance.initialize && dirInstance.initialize()
	  //todo... 这边获取值可以缓存住,优化
	  //第一次取值，会通过get set绑定好数据依赖
	  value = watcher.getValue()
	  //赋值
	  watcher.last = value
	  //调用bind
	  dirInstance.bind(value)

	  return dirInstance
	}

	//解析属性，解析出directive，这个只针对element
	function _compileDirective(el,view,attributes) {
	  var attrs, describe, skipChildren, childNodes,isCurViewRoot


	  isCurViewRoot = el === view.$el ? true : false

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
	    _.log('one element can only have one block directive.')
	  }

	  /**
	   * 策略是：
	   * 1. 如果有block并且不是在根节点上，那么就可以交给子block指令去解析，它会负责解析自己的区块
	   * 2. 如果有block但是是在根节点上，那么证明block的解析已经由父级view完成，那么只需要解析剩余的其他指令就可以了
	   * 3. 没有block那么就正常解析普通就行。
	   */

	  if (!isCurViewRoot && blockDescribes.length) {
	    //只管第一个block
	    _bindDir(blockDescribes[0])
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

	//解析text，只会有一个
	function _compileTextNode(el, view) {
	  var tokens, token, text, placeholder,oneTime

	  token = parseText(el.data)[0]

	  oneTime = token.oneTime

	  //针对变量类型的 文本进行指令解析，区分html和text
	  if (token.type === parser.TextTemplateParserTypes.binding) {

	    _bindDir({
	      name:'',
	      value:token.value,
	      view: view,
	      expression: parseExpression(token.value),
	      oneTime:oneTime,
	      directive: token.html ? 'html' : 'text',
	      el: el
	    })
	  }

	}

	exports.parse = function(el,view) {

	  if (!_.isElement(el)) return


	  //对于文本节点采用比较特殊的处理
	  if (el.nodeType == 3 && _.trim(el.data)) {
	    _compileTextNode(el, view)
	  }

	  //普通节点
	  if ((el.nodeType == 1) && el.tagName.toUpperCase() !== 'SCRIPT') {
	    _compileDirective(el, view, _.toArray(el.attributes))
	  }

	  //集合节点
	  if ((el.nodeType == -1)) {
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
	TAG_ID = config.tagId

	exports.query = function (id) {

	  if (!id) return null

	  //virtual dom 直接返回
	  if (_.isObject(id) && id.__VD__ == true) {
	    return id
	  }

	  if (_.isElement(id)) {
	    return id
	  }

	  if (_.isString(id)) {
	    return document.getElementById(id.replace(/^#/,''))
	  }

	}



	exports.walk = function(dom,fn){

	  if (dom.hasChildNodes()) {
	    for (var i = 0; i < dom.childNodes.length; i++) {

	      if(fn(dom.childNodes[i]) === false) break
	      exports.walk(dom.childNodes[i],fn)

	    }
	  }

	}


	function _matchPatid(node,patId){
	  var nodeType = node.nodeType

	  if (!nodeType || !_.inArray([1,8],nodeType)) return false


	  if (nodeType === 8 && _.trim(node.data) === 'deleted-'+patId) {
	    return node
	  }

	  if (nodeType === 1 && node.getAttribute && parseInt(node.getAttribute(TAG_ID)) === patId) {
	    return node
	  }

	  return null
	}

	/**
	 * 用来通过patId获取对应的节点
	 * @param  {[type]} patId [description]
	 * @return {[type]}       [description]
	 */
	exports.queryPatId = function(root,patId){
	  var node = null

	  exports.walk(root,function(child){
	    if (_matchPatid(child,patId)) {
	      node = child
	      return false
	    }
	  })

	  return node

	}


	//可以的话使用高级查找器，否则使用递归查找
	var _query = document.querySelector ? function(root,patId){

	  return root.querySelector('['+TAG_ID+'="' + patId + '"]')

	} : exports.queryPatId


	/**
	 * 通过virtual dom来查找真实的dom
	 * @param  {[type]} virtualDom [description]
	 * @return {[type]}            [description]
	 */
	exports.queryRealDom = function(virtualDom){
	  var node = null
	  var root = virtualDom.view.$rootView.$el
	  var pid = virtualDom.patId
	  var result = null
	  //需要区分两种情况，查找的节点是否已经软删除

	  //如果没有软删除
	  if (!virtualDom.deleted) {
	    result = _query(root,pid)
	  }else{//如果已经软删除了，那么页面上的就会是一个注释占位节点，这个时候通过取父级来定位

	    //如果父级是root直接从容器开始找
	    var parent

	    if (virtualDom.parentNode.__ROOT__) {
	      parent = root
	    }else{
	      parent = _query(root,virtualDom.parentNode.patId)
	    }

	    // var parentId = virtualDom.parentNode.patId
	    // var parent = _query(root,parentId)
	    //父级都不存在，那么子集肯定没有在dom上
	    if (!parent) return null
	    //之后通过遍历的方式去找注释节点
	    result = exports.queryPatId(parent,pid)
	  }

	  return result
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
	 * check is ie8
	 */

	exports.isIe8 = function(){
	  return /MSIE\ [8]/.test(window.navigator.userAgent)
	}



	var tagHooks = {
	    area: [1, "<map>", "</map>"],
	    param: [1, "<object>", "</object>"],
	    col: [2, "<table><colgroup>", "</colgroup></table>"],
	    legend: [1, "<fieldset>", "</fieldset>"],
	    option: [1, "<select multiple='multiple'>", "</select>"],
	    thead: [1, "<table>", "</table>"],
	    tr: [2, "<table>", "</table>"],
	    td: [3, "<table><tr>", "</tr></table>"],
	    g: [1, '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1">', '</svg>'],
	    //IE6-8在用innerHTML生成节点时，不能直接创建no-scope元素与HTML5的新标签
	    _default: [0, "", ""]
	}
	tagHooks.th = tagHooks.td
	tagHooks.optgroup = tagHooks.option
	tagHooks.tbody = tagHooks.tfoot = tagHooks.colgroup = tagHooks.caption = tagHooks.thead

	_.each("circle,defs,ellipse,image,line,path,polygon,polyline,rect,symbol,text,use".split(','),function(tag){
	  tagHooks[tag] = tagHooks.g //处理SVG
	})

	var rtagName = /<([\w:]+)/



	/**
	 * translate a string to a node
	 * @param  {string} string
	 * @return {element}       generated node
	 */
	exports.string2node = function(string){
	  return exports.string2frag(string).childNodes[0]
	}


	/**
	 * translate a string to a frag
	 * @param  {string} string
	 * @return {fragment}  generated fragment
	 */
	exports.string2frag = function(string){
	  var node = document.createElement('div')
	  var frag = document.createDocumentFragment()

	  var tag = (rtagName.exec(string) || ["", ""])[1].toLowerCase()
	  //取得其标签名
	  var wrap = tagHooks[tag] || tagHooks._default
	  var depth = wrap[0]
	  var prefix = wrap[1]
	  var suffix = wrap[2]
	  var commentData = ''

	  //ie8下面有个很奇怪的bug，就是当第一个节点是注释节点，那么这个注释节点渲染不出来
	  //所以需要做出特殊处理
	  if (exports.isIe8()) {
	    string = string.replace(/\<\!--([\w-\d]+)--\>/g,'<div id="__PAT__COMMENT">$1</div>')
	  }

	  node.innerHTML = prefix + _.trim(string) + suffix

	  while (depth--) {
	    node = node.lastChild
	  }

	  //替换回来
	  if (exports.isIe8()) {
	    exports.walk(node,function(dom){
	      if (dom.getAttribute && dom.getAttribute('id') == '__PAT__COMMENT') {

	        commentData = dom.innerHTML
	        //测试发现，当节点是一个th并且第一个不是合法的th，
	        //那么会多一个空白的父节点，不是很明白为什么这里特殊处理下
	        if (dom.parentNode && dom.parentNode.tagName === "") {
	          dom = dom.parentNode
	        }
	        exports.replace(dom,document.createComment(_.trim(commentData)))
	      }
	    })
	  }

	  var child
	  while (child = node.firstChild) {
	    frag.appendChild(child)
	  }

	  return frag
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
	 * Defer a task to execute it asynchronously. Ideally this
	 * should be executed as a microtask, so we leverage
	 * MutationObserver if it's available, and fallback to
	 * setTimeout(0).
	 *
	 * @param {Function} cb
	 * @param {Object} ctx
	 */

	exports.nextTick = (function () {
	  var callbacks = []
	  var pending = false
	  var timerFunc
	  function nextTickHandler () {
	    pending = false
	    var copies = callbacks.slice(0)
	    callbacks = []
	    for (var i = 0; i < copies.length; i++) {
	      copies[i]()
	    }
	  }
	  /* istanbul ignore if */
	  if (typeof MutationObserver !== 'undefined') {
	    var counter = 1
	    var observer = new MutationObserver(nextTickHandler)
	    var textNode = document.createTextNode(counter)
	    observer.observe(textNode, {
	      characterData: true
	    })
	    timerFunc = function () {
	      counter = (counter + 1) % 2
	      textNode.data = counter
	    }
	  } else {
	    timerFunc = setTimeout
	  }
	  return function (cb, ctx) {
	    var func = ctx
	      ? function () { cb.call(ctx) }
	      : cb
	    callbacks.push(func)
	    if (pending) return
	    pending = true
	    timerFunc(nextTickHandler, 0)
	  }
	})()





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


	/**
	 * htmlspecialchars
	 */

	exports.htmlspecialchars = function(str) {

	  if (!exports.isString(str)) return str

	  //str = str.replace(/&/g, '&amp;')
	  str = str.replace(/</g, '&lt;')
	  str = str.replace(/>/g, '&gt;')
	  str = str.replace(/"/g, '&quot;')
	  str = str.replace(/'/g, '&#039;')
	  return str
	}


	/**
	 * trim string
	 */
	exports.trim=function(str){
	  return str.replace(/(^\s*)|(\s*$)/g, '')
	}


	/**
	 * make a array like obj to a true array
	 * @param  {object} arg array like obj
	 * @return {array}     array
	 */
	exports.toArray = function(arg) {
	  if (!arg || !arg.length) return []
	  var array = []
	  for (var i = 0,l=arg.length;i<l;i++) {
	    array.push(arg[i])
	  }

	  return array
	}


	var toString = Object.prototype.toString


	exports.isArray = function(unknow) {
	  return toString.call(unknow) === '[object Array]'
	}


	exports.isPlainObject = function (obj) {
	  return toString.call(obj) === '[object Object]'
	}


	exports.isObject = function( unknow ) {
	  return typeof unknow === "function" || ( typeof unknow === "object" && unknow != null )
	}


	exports.isElement = function(unknow){
	  return unknow && typeof unknow === 'object' && unknow.nodeType
	}


	exports.isString = function(unknow){
	  return (Object.prototype.toString.call(unknow) === '[object String]')
	}


	exports.isNumber = function(unknow){
	  return (Object.prototype.toString.call(unknow) === '[object Number]')
	}


	/**
	 * Check and convert possible numeric strings to numbers
	 * before setting back to data
	 *
	 * @param {*} value
	 * @return {*|Number}
	 */

	exports.toNumber = function (value) {
	  if (typeof value !== 'string') {
	    return value
	  } else {
	    var parsed = Number(value)
	    return isNaN(parsed)
	      ? value
	      : parsed
	  }
	}


	/**
	 * Strip quotes from a string
	 *
	 * @param {String} str
	 * @return {String | false}
	 */

	exports.stripQuotes = function (str) {
	  var a = str.charCodeAt(0)
	  var b = str.charCodeAt(str.length - 1)
	  return a === b && (a === 0x22 || a === 0x27)
	    ? str.slice(1, -1)
	    : str
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

	exports.hasKey = function(object,key){
	  for (var _key in object) {
	    if (object.hasOwnProperty(_key) && _key == key) return true
	  }

	  return false
	}


	exports.inArray = function(array,item){

	  var index = exports.indexOf(array,item)

	  if (index === -1) return false

	  return true
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

	exports.findAndRemove = function(array,value){
	  var index = exports.indexOf(array,value)
	  if (~index) {
	    array.splice(index,1)
	  }
	}

	exports.findAndReplace = function(array,value,newValue){
	  var index = exports.indexOf(array,value)
	  if (~index) {
	    array.splice(index,1,newValue)
	  }
	}

	exports.findAndReplaceOrAdd = function(array,value,newValue){
	  var index = exports.indexOf(array,value)
	  if (~index) {
	    array.splice(index,1,newValue)
	  }else{
	    array.push(newValue)
	  }
	}


	exports.indexOfKey = function(arrayObject,key,value){
	  if (arrayObject === null) return -1
	  var i = 0, length = arrayObject.length
	  for (; i < length; i++) if (arrayObject[i][key] === value) return i
	  return -1
	}



	var _skipKeyFn = function(){
	  return false
	}

	/**
	 * deep clone
	 * @param  {object} obj       ori obj need deep clone
	 * @param  {function} skipKeyFn function to skip clone
	 * @return {object}           result
	 */
	exports.deepClone = function(obj,skipKeyFn) {

	  skipKeyFn = skipKeyFn || _skipKeyFn

	  if (exports.isPlainObject(obj)) {
	    var copy = {}
	    for (var key in obj) {
	      if (obj.hasOwnProperty(key) && !skipKeyFn(key)) {
	        copy[key] = exports.deepClone(obj[key],skipKeyFn)
	      }
	    }
	    return copy
	  }

	  if (exports.isArray(obj)) {
	    var copy = new Array(obj.length)
	    for (var i = 0, l = obj.length; i < l; i++) {
	      copy[i] = exports.deepClone(obj[i],skipKeyFn)
	    }
	    return copy
	  }

	  return obj
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
	var config = __webpack_require__(1)

	DIR_REGX = parser.DIR_REGX
	INTERPOLATION_REGX = parser.INTERPOLATION_REGX

	//基础指令定义
	var directives = {
	  'bind':__webpack_require__(12),
	  'class':__webpack_require__(13),
	  'model':__webpack_require__(14),
	  'if':__webpack_require__(15),
	  'unless':__webpack_require__(16),
	  'for':__webpack_require__(17),
	  'text':__webpack_require__(23),
	  'html':__webpack_require__(24)
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
	  initialize:noop,
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
	    this.isDestroyed = true
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
	  isBlockDirective:function(attr){
	    var name = _.isString(attr) ? attr : attr.name

	    name = name.replace(config.prefix + '-','')
	    if (directives[name] && directives[name].block) {
	      return true
	    }else{
	      return false
	    }

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
	  //新增一个directive定义
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
	var dirParser = __webpack_require__(11)

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
	 *   priority:3000, //指令的优先级，值越大，绑定时优先级越高
	 *   oneTime:false, //是否是一次性指令，不会响应数据变化
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

	    //如果这个时候还能找到指令需要提示，指令不能包括插值，这种情况下优先处理插值
	    if (("development") != 'production' && dirRegx.test(name)) {
	      _.log('{{}} can not use in a directive,otherwise the directive will not compiled.')
	    }

	    tokens = exports.parseText(value)

	    return {
	      name: name,
	      value: value,
	      directive: 'bind',
	      args: [name],
	      oneTime: false,
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


	  var filters,body,dirParsed

	  dirParsed = dirParser.parse(text)

	  if (!dirParsed.expression) return ''

	  body = _.trim(expParser.compileExpFns(dirParsed.expression))

	  filters = dirParsed.filters || []

	  if (filters.length > 0) {
	    body = '_that.applyFilter(' + body + ',"' + filters.join(',') + '")'
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

	exports.TAG_RE = tagRE
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

	var _ = __webpack_require__(3)

	/**
	 * Parser state
	 */

	var str, dir
	var c, i, l, lastFilterIndex
	var inSingle, inDouble, curly, square, paren

	/**
	 * Push a filter to the current directive object
	 */

	function pushFilter () {
	  var filter = str.slice(lastFilterIndex, i).trim()

	  if (filter) {
	    (dir.filters = dir.filters || []).push(filter)
	  }
	  lastFilterIndex = i + 1
	}

	/**
	 * Parse a directive value and extract the expression
	 * and its filters into a descriptor.
	 *
	 * Example:
	 *
	 * "a + 1 | uppercase | uppercase" will yield:
	 * {
	 *   expression: 'a + 1',
	 *   filters: ['uppercase','uppercase']
	 * }
	 *
	 * @param {String} str
	 * @return {Object}
	 */

	exports.parse = function (s) {


	  str = s
	  inSingle = inDouble = false
	  curly = square = paren = 0
	  lastFilterIndex = 0
	  dir = {}

	  for (i = 0, l = str.length; i < l; i++) {
	    c = str.charCodeAt(i)
	    if (inSingle) {
	      // check single quote
	      if (c === 0x27) inSingle = !inSingle
	    } else if (inDouble) {
	      // check double quote
	      if (c === 0x22) inDouble = !inDouble
	    } else if (
	      c === 0x7C && // pipe
	      str.charCodeAt(i + 1) !== 0x7C &&
	      str.charCodeAt(i - 1) !== 0x7C
	    ) {
	      if (dir.expression == null) {
	        // first filter, end of expression
	        lastFilterIndex = i + 1
	        dir.expression = str.slice(0, i).trim()
	      } else {
	        // already has filter
	        pushFilter()
	      }
	    } else {
	      switch (c) {
	        case 0x22: inDouble = true; break // "
	        case 0x27: inSingle = true; break // '
	        case 0x28: paren++; break         // (
	        case 0x29: paren--; break         // )
	        case 0x5B: square++; break        // [
	        case 0x5D: square--; break        // ]
	        case 0x7B: curly++; break         // {
	        case 0x7D: curly--; break         // }
	      }
	    }
	  }

	  if (dir.expression == null) {
	    dir.expression = str.slice(0, i).trim()
	  } else if (lastFilterIndex !== 0) {
	    pushFilter()
	  }

	  return dir
	}


/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * bind用来处理属性，不用来处理textnode
	 * 支持参数
	 */

	var _ = __webpack_require__(3)

	module.exports = {
	  priority: 3000,
	  bind:function(value){
	    this.update(value)
	  },
	  update:function(value){
	    var args,name
	    args = this.describe.args || []
	    name = args[0]

	    if (!name) {
	      if (true) _.error('can not find the attribute name,check your code。must be t-bind:attributeName="exp"。')
	      return
	    }

	    if (value != null && value !== false) {
	      return this.el.setAttribute(name,value)
	    }

	    //对于特殊的值，就算是null或者false，也要正常赋值
	    if (_.indexOf(['value', 'checked', 'selected'], name) !== -1){
	      return this.el.setAttribute(name,value)
	    }

	    //最后的情况，对于null,false会直接去掉这个属性
	    this.el.removeAttribute(name)

	  }
	}

/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	

	/**
	 * 用来处理 class
	 *
	 * t-class:classname="expression"
	 * 当expression为true时会 为当前节点增加class 'classname'
	 */

	var _ = __webpack_require__(3)

	module.exports = {
	  priority: 3500,
	  bind:function(value){
	    this.update(value)
	  },
	  update:function(value){
	    var args,classname
	    args = this.describe.args || []
	    classname = args[0]

	    if (!classname) {
	      if (true) _.error('can not find the attribute classname,check your code。must be t-class:classname="expression"')
	      return
	    }

	    if (value != null && value !== false) {
	      this.el.addClass(classname)
	    }else{
	      this.el.removeClass(classname)
	    }

	  }
	}

/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(3)



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
	      if (handler) {
	        return el.detachEvent('on' + event, handler)
	      }else{
	        return el.detachEvent('on' + event)
	      }
	    };
	  })(),
	  getValue: function(el) {
	    var o, _i, _len, _results;
	    if (el.type === 'checkbox') {
	      return el.checked;
	    } else if (el.tagName.toUpperCase === 'SELECT') {
	      return this._getSelectedValue(el)
	    } else {
	      return el.value
	    }
	  },
	  _getSelectedValue:function(el){

	    var multi = el.hasAttribute('multiple')
	    var res = multi ? [] : null
	    var op, val, selected
	    for (var i = 0, l = el.options.length; i < l; i++) {
	      op = el.options[i]
	      selected = op.selected
	      if (selected) {
	        val = op.value
	        if (multi) {
	          res.push(val)
	        } else {
	          return val
	        }
	      }
	    }
	    return res
	  }
	}



	var defaultCallback = function() {
	  var self = this
	  var val = Util.getValue(self.el.getElement())
	  var key = self.describe.value

	  if (val == self.curValue) return

	  //看下是不是改的一级key,是的话就需要从rootView开始改
	  if (self.view.orikeys && _.inArray(self.view.orikeys, key)) {
	    self.setValue(key, val, self.view.$rootView.$data)
	  } else {
	    self.setValue(key, val, self.view.$data)
	  }
	}


	var tagTypes = {
	  'text':{
	    eventType:'keyup',
	    callback:defaultCallback,
	    update:function(value){
	      //如果设置了安全选项，那么就不允许存在破坏节点的特殊字符
	      if (this.describe.args[0] == 'safe' && _.isString(value)) {
	        value = _.htmlspecialchars(value)
	      }
	      this.el.setAttribute('value',value)
	    }
	  },
	  'checkbox':{
	    eventType:'click',
	    callback:function(){
	      var self = this
	      var el = self.el.getElement()
	      var model = self.__watcher.last
	      if (_.isArray(model)) {
	        var val = el.value
	        if (el.checked) {
	          if (_.indexOf(model, val) < 0) {
	            model.push(val)
	          }
	        } else {
	          model.$remove(val)
	        }
	      } else {
	        defaultCallback.call(this)
	      }
	    },
	    update:function(value){
	      var checked
	      var self = this
	      if (_.isArray(value)) {
	        checked = _.indexOf(value, self.el.getAttribute('value')) > -1
	        this.el.setAttribute('checked',checked)
	      }else{
	        this.el.setAttribute('checked',value)
	      }
	    }
	  },
	  'radio':{
	    eventType:'click',
	    callback:defaultCallback,
	    update:function(value){
	      var self = this
	      var domValue = self.el.getAttribute('value')
	      if (value == domValue) {
	        self.el.setAttribute('checked',true)
	      }else{
	        self.el.setAttribute('checked',false)
	      }
	    }
	  },
	  'select':{
	    eventType:'change',
	    callback:defaultCallback,
	    update:function(value){
	      var self = this
	      var el = self.el
	      var multi = el.hasAttribute('multiple') && _.isArray(value)
	      var options = el.childNodes

	      var i = options.length
	      var op, val,tmp
	      while (i--) {
	        op = options[i]
	        val = op.getAttribute('value')
	        tmp = multi
	          ? indexOf(value, val) > -1
	          : value == val
	        op.setAttribute('selected',tmp)
	      }
	    }
	  }
	}



	module.exports = {
	  priority: 3000,
	  bind:function(value) {
	    //添加事件监听
	    var self = this

	    var tagName = self.el.tagName.toUpperCase()
	    var handler,element

	    if (tagName === 'INPUT') {
	      handler = tagTypes[self.el.getAttribute('type')] || tagTypes.text
	    } else if (tagName === 'SELECT') {
	      handler = tagTypes.select
	    } else if (tagName === 'TEXTAREA') {
	      handler = tagTypes.text
	    } else {
	      ("development") !== 'production' && _.error(
	        't-model does not support element type: ' + tagName
	      )
	      return
	    }

	    self.handler = handler

	    self.callback = function(){
	      //自身不需要重复修改
	      //self.el.skipUpdate = true
	      self.handler.callback.call(self)
	    }

	    //_.bind(self.handler.callback,self)
	    self.eventType = self.handler.eventType


	    self.view.on('afterMount',function(){
	      element = self.el.getElement()
	      Util.bindEvent(element, self.eventType, self.callback)
	    })

	    this.el.__pat_model = this

	    this.update(value)

	  },
	  setValue: function(key, val,scope) {
	    if (_.isString(val)) {
	      val = '"'+val+'"'
	    }
	    try{
	      new Function('$scope', 'return $scope.' + key + '=' + val)(scope)
	      //在脏检测模式下，改变值需要手动调用脏检测
	      if (this.view.$rootView && this.view.$rootView.__dataCheckType == 'dirtyCheck') {
	        this.view.$rootView.$digest()
	      }

	    }catch(e){
	      if (true) _.log('error when watcher set the value,please check your key: "' + this.key + '"', e)
	    }

	    return
	  },
	  forceUpdate:function(){
	    if (this.__watcher) {
	      this.update(this.__watcher.getValue())
	    }
	  },
	  update: function(value) {

	    if (value === undefined || value === null) {
	      value = ''
	    }

	    this.curValue = value

	    this.handler.update.call(this,value)
	  },
	  unbind: function() {
	    this.el.__pat_model = null
	    Util.unbindEvent(this.el.getElement(), this.eventType,this.callback)
	  }
	}

/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	
	var _ = __webpack_require__(3)
	/**
	 * if 指令，这是一个block会产生自己的scope,自己的view
	 * @type {Object}
	 */
	module.exports = {
	  block:true,
	  priority: 4000,
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
	        dataCheckType:this.view.$rootView.__dataCheckType,
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
	        data:this.view.$data,
	        dataCheckType:this.view.$rootView.__dataCheckType,
	        rootView:this.view.$rootView
	      })
	      this.el.replace(newVdNode)
	      this.childView.fire('afterMount') //触发事件

	      this.el = newVdNode
	      this.bound = true
	      return
	    }

	    if (!value && this.bound == true){
	      //软删除
	      this.el.remove(true)
	      this.childView.$destroy()
	      this.childView = false
	      this.bound = false
	      return
	    }
	    //剩下的情况都是if的判断不需要改变是否渲染的，这个时候如果是脏检测模式，需要调用子view的脏检测
	    if (this.view.$rootView.__dataCheckType == 'dirtyCheck') {
	      this.childView && this.childView.$digest()
	    }

	  },
	  unbind:function(){
	    this.childView && this.childView.$destroy()
	  }
	}

/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	
	var _ = __webpack_require__(3)

	var _if = __webpack_require__(15)

	/**
	 * unless 指令
	 * @type {Object}
	 */
	module.exports = _.assign({},_if,{
	  bind:function(value){
	    return _if.bind.call(this,!value)
	  },
	  update:function(value){
	    return _if.update.call(this,!value)
	  }
	})

/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(3)
	var parser = __webpack_require__(9)
	var parseExpression = parser.parseExpression
	var Data = __webpack_require__(18)
	var Config = __webpack_require__(1)


	//差异更新的几种类型
	var UPDATE_TYPES = {
	  MOVE_EXISTING: 1,
	  REMOVE_NODE: 2,
	  INSERT_MARKUP: 3
	}

	var KEY_ID = 0

	module.exports = {
	  block: true,
	  priority: 4000,
	  shoudUpdate: function(last, current) {

	    var lazy = this.describe.args[0] == 'lazy' ? true : false
	    //如果设置了lazy属性，for指令只有在整个引用变化了才会重新渲染，
	    if (lazy){
	      return  last !== current
	    }
	    //否则 任何时候都是需要更新的，哪怕两次的值一样，也是需要更新的，因为你要考虑子view的更新
	    return true
	  },
	  initialize:function(){
	    // for 语句比较特殊，不使用系统生成的expression
	    var inMatch = this.describe.value.match(/(.*) in (.*)/)
	    if (inMatch) {
	      var itMatch = inMatch[1].match(/\((.*),(.*)\)/)
	      if (itMatch) {
	        this.iterator = _.trim(itMatch[1])
	        this.alias = _.trim(itMatch[2])
	      } else {
	        this.iterator = Config.defaultIterator //默认的key
	        this.alias = _.trim(inMatch[1])
	      }
	      //修改观察者对应的expression
	      this.__watcher.expression = parseExpression(inMatch[2])
	    }

	    if (("development") != 'production' && !this.alias) {
	      _.error('required a alias in for directive')
	    }

	    this.isOption = this._isOption()

	    this.oldViewMap = {}
	    this.oldViewLists = []
	    this.__node = this.el.clone()

	    this.orikeys = []

	    var ori = this.view.$data.__ori__ || this.view.$data
	    //需要把当前的数据复制过来
	    for (var oriKey in ori) {
	      if (ori.hasOwnProperty(oriKey)) {
	        this.orikeys.push(oriKey)
	      }
	    }

	  },
	  _isOption:function(){
	    var tag  = this.el.tagName.toUpperCase()
	    var parentTag  = this.el.parentNode.tagName.toUpperCase()
	    return (tag === 'OPTION' || tag === 'OPTGROUP') &&
	    parentTag === 'SELECT'
	  },
	  bind: function(value) {

	    var self = this

	    this.startNode = this.el
	    //第一次直接软删除，作为定位
	    this.startNode.remove(true)
	    this.isUpdated = false

	    this.update(value)

	    //父view触发后，通知子view也fire
	    if (self.view.__rendered) {
	      self._fireChilds()
	    }else{
	      self.view.on('afterMount',function(){
	        self._fireChilds()
	      })
	    }
	  },
	  _fireChilds:function(){
	    //触发子view的事件
	    _.each(this.oldViewLists,function(view){
	      view.fire('afterMount')
	    })

	  },
	  _generateKey: function() {
	    return 'key' + KEY_ID++
	  },
	  _generateNewChildren: function(newLists) {

	    var newViewMap = this.newViewMap = {}
	    var newViewLists = this.newViewLists = []
	    var oldViewMap = this.oldViewMap
	    var self = this
	    var data,newNode,name
	    var curKey = '__pat_key__'


	    _.each(newLists, function(item, key) {

	      name = item[curKey]

	      if (name && oldViewMap[name] && oldViewMap[name].$data[self.alias] === item) {
	        newViewMap[name] = oldViewMap[name]
	        //发现可以复用，就直接更新view就行
	        //key需要重新赋值,
	        //如果不是脏检测模式会自动做出defineproperty的监听改变
	        //而脏检测模式下会调用脏检测重新局部渲染模板
	        if(self.iterator) oldViewMap[name].$data[self.iterator] = key

	        if (self.view.$rootView.__dataCheckType == 'dirtyCheck') {
	          oldViewMap[name].$digest()
	        }
	      } else {
	        //否则需要新建新的view
	        data = {}

	        _.each(self.orikeys,function(oriKey){
	          data[oriKey] = self.view.$data[oriKey]
	        })

	        if(self.iterator) data[self.iterator] = key

	        data[self.alias] = item

	        newNode = self.__node.clone()
	        //对于数组我们需要生成私有标识，方便diff。对象直接用key就可以了
	        //有点hacky,但是没办法，为了达到最小的更新，需要注入一个唯一的健值。
	        name = self._generateKey()
	        item[curKey] = name

	        newViewMap[name] = new self.view.constructor({
	          el: newNode,
	          data: data,
	          vid:name,
	          dataCheckType:self.view.$rootView.__dataCheckType,
	          rootView:self.view.$rootView
	        })
	        newViewMap[name].orikeys = self.orikeys
	        //增加依赖，这样父级值改变了也会自动改变子view的属性
	        self.view.__dependViews.push(newViewMap[name])
	      }
	      newViewLists.push(newViewMap[name])

	    })

	  },
	  _diff: function() {

	    var nextIndex = 0 //代表到达的新的节点的index
	    var lastIndex = 0;//代表访问的最后一次的老的集合的位置
	    var prevChild, nextChild
	    var oldViewMap = this.oldViewMap
	    var newViewMap = this.newViewMap
	    var newViewLists = this.newViewLists

	    var diffQueue = this.diffQueue = []
	    var name

	    for (var i = 0,l=newViewLists.length;i<l;i++) {

	      name = newViewLists[i].__vid

	      prevChild = oldViewMap && oldViewMap[name];
	      nextChild = newViewLists[i];

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
	        }

	        //新增加的节点，也组装差异对象放到队列里
	        //添加差异对象，类型：INSERT_MARKUP
	        diffQueue.push({
	          name:name,
	          type: UPDATE_TYPES.INSERT_MARKUP,
	          fromIndex: null,
	          toIndex: nextIndex,
	          markup: nextChild.$el //新增的节点，多一个此属性，表示新节点的dom内容
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
	    var self = this
	    var update, updatedIndex, updatedChild
	    var initialChildren = {}
	    var deleteChildren = []
	    var updates = this.diffQueue
	    for (var i = 0; i < updates.length; i++) {
	      update = updates[i];
	      if (update.type === UPDATE_TYPES.MOVE_EXISTING || update.type === UPDATE_TYPES.REMOVE_NODE) {

	        updatedChild = this.oldViewMap[update.name]
	        initialChildren[update.name] = updatedChild.$el
	        //所有需要修改的节点先删除,对于move的，后面再重新插入到正确的位置即可
	        deleteChildren.push(updatedChild)
	      }
	    }
	    //删除所有需要先删除的
	    _.each(deleteChildren, function(child) {
	      //删除
	      //第一个节点不能硬删除，还要留着定位呢,先软删除
	      if (child.$el == self.startNode) {
	        child.$el.remove(true)
	      }else{
	        child.$el.remove()
	      }
	      _.findAndRemove(self.view.__dependViews,child)
	      child.$destroy()
	    })

	    //保存一个复用的老的view队列
	    var oldNodeLists = this._generateOldLists()

	    //再遍历一次，这次处理新增的节点，还有修改的节点这里也要重新插入
	    for (var k = 0; k < updates.length; k++) {
	      update = updates[k];
	      switch (update.type) {
	        case UPDATE_TYPES.INSERT_MARKUP:
	          this.handleInsertMarkup(update,oldNodeLists)
	          //insertFn.call(this,update.markup, update.toIndex,oldNodeLists);
	          break;
	        case UPDATE_TYPES.MOVE_EXISTING:
	          this._insertChildAt.call(this,initialChildren[update.name], update.toIndex,oldNodeLists);
	          //update.fire('afterMount')
	          break;
	        case UPDATE_TYPES.REMOVE_NODE:
	          // 什么都不需要做，因为上面已经帮忙删除掉了
	          break;
	      }
	    }

	  },
	  handleInsertMarkup:function(update,oldNodeLists){
	    var insertFn = this._insertChildAt
	    insertFn.call(this,update.markup, update.toIndex,oldNodeLists)
	    //对于更新，需要fire事件
	    if (this.isUpdated) {
	      this.newViewMap[update.name] && this.newViewMap[update.name].fire('afterMount') //触发事件
	    }

	  },
	  _generateOldLists:function(){


	    var oldViewLists = this.oldViewLists
	    var lists = []

	    if (this.startNode.deleted) {
	      lists.push(this.startNode)
	    }

	    _.each(oldViewLists,function(oldView){
	      if (oldView && oldView.isDestroyed !== true) {
	        lists.push(oldView.$el)
	      }
	    })

	    return lists

	  },
	  //用于把一个node插入到指定位置，通过之前的占位节点去找
	  _insertChildAt:function(newNode,toIndex,oldNodeLists){
	    var self = this

	    var start = this.startNode
	    var end = oldNodeLists[oldNodeLists.length - 1]
	    //如果第一个是删除的节点，证明是定位，需要改变toIndex
	    if (start.deleted) {
	      toIndex = toIndex + 1
	    }

	    nextNode = oldNodeLists[toIndex]
	    if (nextNode) {
	      newNode.before(nextNode)
	      oldNodeLists.splice(toIndex,0,newNode)
	    }else{
	      newNode.after(end)
	      oldNodeLists.push(newNode)
	    }
	  },
	  update: function(newLists) {
	    //策略，先删除以前的，再使用最新的，找出最小差异更新
	    //参考reactjs的差异算法
	    this._generateNewChildren(newLists)

	    this._diff()
	    this._patch()

	    this.oldViewMap = this.newViewMap
	    this.oldViewLists = this.newViewLists

	    //如果后面有数据，那就硬删除掉startNode节点,把最新的第一个元素作为start节点
	    if (this.oldViewLists.length > 0 && this.startNode.deleted) {
	      this.startNode.remove()
	      this.startNode = this.oldViewLists[0].$el
	    }

	    this.isUpdated = true
	    this.updateModel()
	  },
	  /**
	   * For option lists, update the containing model on
	   * parent <select>.
	   */

	  updateModel: function () {
	    if (this.isOption) {
	      var parent = this.startNode.parentNode
	      var model = parent && parent.__pat_model
	      if (model) {
	        model.forceUpdate()
	      }
	    }
	  },
	  unbind: function() {
	    _.each(this.oldViewMap,function(view){
	      view.$destroy()
	    })
	    this.oldViewMap = null
	    this.oldViewLists = null
	  }
	}

/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	var Watcher = __webpack_require__(19)
	var _ = __webpack_require__(3)
	var Observer = __webpack_require__(21)

	__webpack_require__(22)


	var VB_ID = 0

	var defineGetProxy = function(obs,_key) {
	  var ob = obs[_key]

	  return function() {

	    ob.addWatcher()

	    if (_.isArray(ob.val) && !ob.val.__ob__) {
	      ob.val.__inject__ = true
	      ob.val.__ob__ = ob
	    }
	    //当用户赋值了一个inject过的数组，那么这边的__ob__需要改掉，不然还用的以前的ob就更新不了了
	    if (_.isArray(ob.val) && ob.val.__ob__ && ob.val.__ob__ != ob) {
	      ob.val = ob.val.slice()
	      ob.val.__inject__ = true
	      ob.val.__ob__ = ob
	    }

	    return ob.val

	  }
	}

	var defineSetProxy = function(obs,_key){

	  var ob = obs[_key]

	  return function(newVal) {

	    if (newVal === ob.val) {
	      return
	    }

	    //有些已经失效的watcher先去掉
	    ob.unique()

	    //如果是对象需要特殊处理
	    if (_.isObject(newVal)) {
	      ob.val = exports.inject(newVal)
	      //依赖的watcher需要重新get一遍值
	      //还要考虑scope有没有改变
	      ob.depend()
	    }else{
	      ob.val = newVal
	    }

	    ob.notify()

	  }
	}

	var define = null

	if (_.isIe8()) {


	  window.execScript([
	    'Function parseVB(code)',
	    '\tExecuteGlobal(code)',
	    'End Function'
	  ].join('\r\n'), 'VBScript')

	  define = function(obj) {
	    var buffer = [],
	      className,
	      command = [],
	      cb_poll = {},
	      re;
	    var props = {}
	    var obs = {}

	    function defineSet(key, callback) {
	      cb_poll[key + '_set'] = callback;
	      buffer.push(
	        '\tPublic Property Let [' + key + '](value)',
	        '\t\tCall [_pro](me, "set", "' + key + '", value)',
	        '\tEnd Property',
	        '\tPublic Property Set [' + key + '](value)',
	        '\t\tCall [_pro](me, "set", "' + key + '", value)',
	        '\tEnd Property'
	      )
	    }

	    function defineGet(key, callback) {
	      cb_poll[key + '_get'] = callback
	      buffer.push(
	        '\tPublic Property Get [' + key + ']',
	        '\tOn Error Resume Next', //必须优先使用set语句,否则它会误将数组当字符串返回
	        '\t\tSet [' + key + '] = [_pro](me, "get", "' + key + '")',
	        '\tIf Err.Number <> 0 Then',
	        '\t\t[' + key + '] = [_pro](me, "get", "' + key + '")',
	        '\tEnd If',
	        '\tOn Error Goto 0',
	        '\tEnd Property'
	      )
	    }

	    function proxy(me, type, key, value) {
	      if (type == 'get') {
	        return cb_poll[key + '_get'].apply(re, [value]);
	      } else {
	        cb_poll[key + '_set'].apply(re, [value]);
	      }
	    }

	    for (var key in obj) {
	      if ((obj.hasOwnProperty && !obj.hasOwnProperty(key)) || hasSpecialKey(key)) continue
	      obs[key] = new Observer()
	      obs[key].val = obj[key]
	      obs[key].key = key

	      props[key] = {
	        enumerable: true,
	        configurable: true,
	        get: defineGetProxy(obs, key),
	        set: defineSetProxy(obs, key),
	      }
	    }

	    for (var key in props) {
	      if (!props.hasOwnProperty(key)) continue
	      if (props[key]['set'] || props[key]['get']) {
	        if (props[key]['set']) {
	          defineSet(key, props[key]['set']);
	        }
	        if (props[key]['get']) {
	          defineGet(key, props[key]['get']);
	        }
	      }

	    }


	    buffer.push("\tPublic [" + '__pat_key__' + "]")
	    buffer.push("\tPublic [" + '__ori__' + "]")
	    buffer.push("\tPublic [" + '__inject__' + "]")

	    buffer.unshift(
	      '\r\n\tPrivate [_pro]',
	      '\tPublic Default Function [self](proxy)',
	      '\t\tSet [_pro] = proxy',
	      '\t\tSet [self] = me',
	      '\tEnd Function'
	    )

	    buffer.push('End Class')

	    buffer = buffer.join('\r\n')

	    className = 'VB' + (VB_ID++)

	    command.push('Class ' + className + buffer)
	    command.push([
	      'Function ' + className + 'F(proxy)',
	      '\tSet ' + className + 'F = (New ' + className + ')(proxy)',
	      'End Function'
	    ].join('\r\n'))

	    command = command.join('\r\n')

	    window['parseVB'](command)

	    re = window[className + 'F'](proxy)

	    re.__ori__ = obj
	    re.__inject__ = true


	    return re

	  }
	} else {
	  define = function(obj) {
	    //var re
	    var props = {}
	    var obs = {}
	    var newObj = {}

	    for (var key in obj) {

	      if (!obj.hasOwnProperty(key) || hasSpecialKey(key)) continue
	      obs[key] = new Observer()
	      newObj[key] = obj[key]

	      obs[key].val = newObj[key]
	      obs[key].key = key

	      props[key] = {
	        enumerable:true,
	        configurable:true,
	        get:defineGetProxy(obs,key),
	        set:defineSetProxy(obs,key),
	      }
	    }

	    Object.defineProperties(newObj, props)

	    newObj.__ori__ = obj
	    newObj.__inject__ = true

	    return newObj
	  }

	}

	function hasSpecialKey(key){
	  return _.indexOf(['__ori__','__inject__','__pat_key__'],key) != -1
	}

	function _oriData(injectData){
	  var result = null,ori

	  if (!injectData) return injectData

	  result = injectData

	  if (_.isArray(injectData)) {
	    result = []
	    _.each(injectData,function(item,key){
	      result.push(_oriData(item))
	    })
	  }else if(_.isPlainObject(injectData)){
	    ori = injectData.__ori__ || injectData
	    result = {}
	    _.each(ori,function(v,key){

	      if (hasSpecialKey(key)) return

	      result[key] = _oriData(injectData[key])
	    })
	  }
	  return result
	}

	exports.define = define


	exports.normalize = _oriData

	exports.inject = function(data,deep) {
	  var newData = null

	  //对于已经注入的对象，我们需要重新复制一份新的
	  if (data.__inject__){
	    if (!deep) {
	      return data
	    }else{
	      data = _oriData(data)
	    }
	  }

	  if (_.isArray(data)) {

	    newData = []
	    newData.__inject__ = true
	    var tmpl
	    _.each(data,function(value){
	      tmpl = exports.inject(value,deep)
	      newData.push(tmpl)
	    })
	    return newData
	  }

	  if (_.isPlainObject(data)) {
	    newData = exports.define(data)
	    //检测对象的值，需要再递归的去inject
	    _.each(data,function(value,key){
	      if (_.isObject(value)) {
	        //赋值，同时会触发set，这样就把observer的值注入好了
	        newData[key] = exports.inject(value,deep)
	      }
	    })

	    return newData
	  }

	  return data
	}

/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(3)
	var Queue = __webpack_require__(20)

	var watcherId = 1

	function wid(){
	  return watcherId ++
	}

	//观察者
	function Watcher(view, expression, callback) {
	  this.__directives = []
	  this.__view = view
	  this.expression = expression
	  this.callbacks = callback ? [callback] : []
	  this.scope = view.$data
	  this.last = null
	  this.current = null
	  this.__depend = false //是否已经做过属性依赖的检测了
	  this.id = wid()
	}

	//当前正在解析的watcher,全局只有唯一的一个
	Watcher.currentTarget = null


	Watcher.prototype._applyFilter = function(value, filterName) {

	  var filter = this.__view.$rootView.__filters[filterName]
	  if (filter) {
	    return filter.call(this.__view.$rootView, value, this.scope)
	  }
	  return value
	}

	Watcher.prototype.applyFilter = function(value, filterName) {

	  if (!filterName) return value

	  var filters = filterName.split(',')
	  var result = value

	  for (var i = 0; i < filters.length; i++) {
	    result = this._applyFilter(result,filters[i])
	  }

	  return result
	}

	Watcher.prototype.getValue = function() {
	  if (!this.expression) return ''
	  var value

	  //取值很容易出错，需要给出错误提示
	  try {
	    if (!this.__depend) Watcher.currentTarget = this
	    value = new Function('_scope', '_that', 'return ' + this.expression)(this.scope, this)
	    if (!this.__depend) Watcher.currentTarget = null
	  } catch (e) {

	    if (!this.__depend) Watcher.currentTarget = null
	    if (true) _.log('error when watcher get the value,please check your expression: "' + this.expression + '"', e)
	  }

	  this.__depend = true
	  return value
	}


	Watcher.prototype.check = function() {
	  var self = this

	  //自定义的watcher直接执行
	  if (this.isUserWatcher) {
	    this.current = this.getValue()
	    if (this.last != this.current) {
	      _.each(this.callbacks, function(callback) {
	        callback(self.last, self.current)
	      })
	    }
	    this.last = this.current

	  }else{

	    //对于脏检测就直接调用check
	    //对于defineProperties需要放入队列
	    if (this.__view.$rootView.__dataCheckType == 'defineProperties') {
	      //系统watcher加入异步批量队列
	      Queue.update(this)
	    }else{
	      this.batchCheck()
	    }

	  }

	}

	//最终会调用这个方法
	Watcher.prototype.batchCheck = function() {
	  var self = this
	  var last = this.last
	  var current = this.current = this.getValue()

	  _.each(this.__directives, function(dir) {
	    //directive自己判断要不要更新
	    if (dir.shoudUpdate(last, current)) {
	      //调用父级view的hook
	      self.__view.$rootView.fire('beforeDirectiveUpdate', dir, last, current)
	      dir.update && dir.update(current)
	      self.__view.$rootView.fire('afterDirectiveUpdate', dir, last, current)
	    }
	  })

	  this.last = current

	}

	Watcher.prototype.destroy = function() {
	  //通知所有的directive销毁
	  this.isDestroyed = true
	  _.each(this.__directives, function(dir) {
	    dir.destroy && dir.destroy()
	  })

	}



	module.exports = Watcher

/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(3)

	//全局唯一的队列
	var queue = []
	  //正在等待更新的watcher
	var waiting = {}

	var isWating = false
	var isUpdating = false


	function flushUpdate() {

	  if (!isWating) return

	  isUpdating = true

	  _.each(queue, function(watcher) {
	    //如果watcher本身已经被销毁了（比如if,for的view destroy），就不需要再check了
	    if (!watcher.isDestroyed) watcher.batchCheck()
	    waiting[watcher.id] = null
	  })

	  queue = []
	  waiting = {}
	  isWating = isUpdating = false

	}


	exports.update = function(watcher) {
	  var id = watcher.id

	  if (!waiting[id]) {

	    if (isUpdating) {
	      watcher.batchCheck()
	      return
	    }

	    queue.push(watcher)
	    waiting[id] = queue.length

	    if (!isWating) {
	      isWating = true
	      _.nextTick(flushUpdate)
	    }
	  }

	}

	exports.flushUpdate = flushUpdate

/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(3)
	var Watcher = __webpack_require__(19)
	var Data = __webpack_require__(18)
	var Class = _.Class



	var Observer = Class.extend({
	  init:function() {

	    this.watchers = []
	  },
	  addWatcher:function(){
	    var currentTarget = Watcher.currentTarget
	    var watchers = this.watchers

	    if (currentTarget && _.indexOf(watchers,currentTarget) == -1) {
	      watchers.unshift(currentTarget)
	    }
	  },
	  unique:function(){
	    var watchers = this.watchers
	    var newWatchers = []

	    _.each(watchers,function(watcher){
	      if (!watcher.isDestroyed) {
	        newWatchers.push(watcher)
	      }
	    })
	    this.watchers = newWatchers
	  },
	  depend:function(){
	    var watchers = this.watchers
	    _.each(watchers,function(watcher){
	      watcher.__depend = false
	      watcher.getValue()
	    })
	  },
	  notify:function(){

	    _.each(this.watchers,function(watcher){
	      watcher.check()
	    })

	  }

	})

	module.exports = Observer

/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	
	var _ = __webpack_require__(3)
	var Data = __webpack_require__(18)

	var arrayMethods = [
	  'push',
	  'pop',
	  'shift',
	  'unshift',
	  'splice',
	  'sort',
	  'reverse'
	]


	var arrayPrototype = Array.prototype

	_.each(arrayMethods,function(key) {

	  var originMethod = arrayPrototype[key]

	  arrayPrototype[key] = function(){
	    var i = arguments.length
	    var args = new Array(i)
	    while (i--) {
	      args[i] = arguments[i]
	    }

	    var result

	    //对于有观察的数组，需要特殊处理
	    if (this.__ob__) {

	      if (key == 'push' || key == 'unshift') {
	        args = Data.inject(args)
	      }

	      if (key == 'splice') {
	        args = args.slice(0,2).concat(Data.inject(args.slice(2)))
	      }

	      result = originMethod.apply(this, args)

	      this.__ob__.notify()

	    }else{

	      result = originMethod.apply(this, args)

	    }

	    return result
	  }

	})


	//增加两个方法
	arrayPrototype.$set = function(index, val) {
	  if (index >= this.length) {
	    this.length = index + 1
	  }
	  return this.splice(index, 1, val)[0]
	}

	arrayPrototype.$remove = function(item) {
	  if (!this.length) return
	  var index = _.indexOf(this, item)
	  if (index > -1) {
	    return this.splice(index, 1)
	  }
	}








/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * 这是非常特殊的一个directive，用来处理文本节点的插值
	 */


	var _ = __webpack_require__(3)

	module.exports = {
	  priority: 3000,
	  bind:function(value) {
	    //对于不是一次性的节点，需要做包裹，方便下次定位
	    if (!this.describe.oneTime) {
	      this.el.oneTime = false
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

/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * 这是非常特殊的一个directive，用来处理文本节点的插值
	 */


	var _ = __webpack_require__(3)
	var elements = __webpack_require__(25)
	var Dom = __webpack_require__(26)

	module.exports = {
	  block:true,
	  priority: 3000,
	  bind:function(value) {
	    this.update(value)
	  },
	  update:function(value){
	    if (value === undefined || value === null) {
	      value = ''
	    }
	    //compile html 得到一个带有根node的节点,根node就是collection节点
	    var el = Dom.transfer(value,true)
	    el.parentNode = this.el.parentNode
	    //elements
	    //var newCollection = elements.createElement('template',{},el.childNodes)
	    //把当前节点替换成一个collection节点
	    this.el.replace(el)
	    this.el = el
	  },
	  unbind:function(){

	  }
	}

/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(3)
	var Class = _.Class
	var config = __webpack_require__(1)


	var noop = function() {}


	var singgleCloseTags = {
	  'area': true,
	  'base': true,
	  'br': true,
	  'col': true,
	  'embed': true,
	  'hr': true,
	  'img': true,
	  'input': true,
	  'keygen': true,
	  'link': true,
	  'meta': true,
	  'param': true,
	  'source': true,
	  'track': true,
	  'wbr': true
	}

	PAT_ID = 1

	TAG_ID = config.tagId

	function getPatId() {
	  return PAT_ID++
	}


	/*
	 * Glue methods for compatiblity
	 */

	function _hasClass(el, cls) {
	  if (el.classList) {
	    return el.classList.contains(cls)
	  } else if (el.className) {
	    return _.indexOf(_.trim(el.className).split(/\s+/),cls) >= 0
	  }
	}

	function _removeClass(el, cls) {
	  if (el.classList) {
	    el.classList.remove(cls)
	  } else {
	    var classes = _.trim(el.className).split(/\s+/)

	    for (var i = classes.length - 1; i >= 0; i--) {
	      if (classes[i] == cls) {
	        classes.splice(i, 1)
	      }
	    }

	    el.className = classes.join(' ')
	  }
	}

	function _addClass(el, cls) {
	  if (el.classList) {
	    el.classList.add(cls)
	  } else if (!_hasClass(el, cls)) {
	    el.className += ' ' + cls
	  }
	}


	function _getAttribute(element,key){
	  if (_.indexOf(['value', 'checked', 'selected'], key) !== -1 && key in element) {
	    return element[key]
	  } else {
	    element.getAttribute(key)
	  }
	}




	//一些dom的操作，会抛出事件
	var domProp = {
	  _normalizeDom:function(el){

	    var results = []
	    if (el.nodeType == 11) {
	      results = _.toArray(el.childNodes) || []
	    }else{
	      results = [el]
	    }

	    return results
	  },
	  domBefore:function(el,target){
	    var els = this._normalizeDom(el)
	    this.view.$rootView.fire('beforeAddBlock',els,this)
	    _.before(el,target)
	    this.view.$rootView.fire('afterAddBlock',els,this)
	  },
	  domAfter:function(el,target){
	    var els = this._normalizeDom(el)

	    this.view.$rootView.fire('beforeAddBlock',els,this)
	    _.after(el,target)
	    this.view.$rootView.fire('afterAddBlock',els,this)
	  },
	  domReplace:function(target,el){
	    var els = this._normalizeDom(el)
	    var targets = this._normalizeDom(target)

	    this.view.$rootView.fire('beforeAddBlock',els,this)
	    this.view.$rootView.fire('beforeDeleteBlock',targets,this)
	    _.replace(target,el)
	    this.view.$rootView.fire('afterDeleteBlock',targets,this)
	    this.view.$rootView.fire('afterAddBlock',els,this)
	  },
	  domRemove:function(el){
	    var els = this._normalizeDom(el)
	    this.view.$rootView.fire('beforeDeleteBlock',els,this)
	    _.remove(el)
	    this.view.$rootView.fire('afterDeleteBlock',els,this)
	  }
	}

	var Node = Class.extend(domProp,{
	  __VD__:true,
	  init: function() {

	  },
	  mountView: function(view) {
	    var html, self

	    self = this
	    self.view = view

	    //mountView被认为只有在一次性生成dom放到页面上才会使用
	    //所以这里可以直接认为有了patId后就已经生成了dom,可以拿到dom
	    self.mountId()

	    html = this.deleted ? self.mountDeleted(view) : self.mountHtml(view)

	    return html
	  },
	  //软删除的节点，会在页面上存在一个注释，方便确认位置
	  mountDeleted:function(){
	    return '<!--deleted-' + this.patId + '-->'
	  },
	  mountHtml: function() {
	    return ''
	  },
	  mountId: function() {
	    if (!this.patId){
	      this.patId = getPatId()
	    }
	  },
	  _findAndSplice: function(dstEl, replace) {
	    var childNodes = this.childNodes
	    if (!childNodes) return
	    _.each(childNodes, function(child, index) {
	      if (child == dstEl) {
	        dstEl.parentNode = this
	        replace ? childNodes.splice(index, 1, replace) : childNodes.splice(index, 1)
	      }
	    })
	  },
	  getElement: function() {
	    var self = this

	    if (!self.patId || !self.view) return
	    if (self.element) return self.element

	    self.element = _.queryRealDom(self)
	    return self.element
	  },
	  clone: function(parentNode) {
	    var options = null
	    var childNodes

	    //克隆初始化属性
	    options = _.deepClone(this.options, function(key) {
	      return key == 'childNodes' ? true : false
	    })

	    var newNode = new this.constructor(options)
	    //parentNode也需要特殊处理
	    newNode.parentNode = parentNode || this.parentNode

	    //对于子节点需要特殊处理
	    if (this.options.childNodes) {
	      childNodes = []
	      _.each(this.options.childNodes, function(child) {
	        childNodes.push(child.clone(newNode))
	      })
	      options.childNodes = childNodes
	      newNode.childNodes = childNodes
	    }

	    return newNode

	  },
	  pre: function(withDeleted) {
	    var childNodes = this.parentNode.childNodes
	    var preNode, child, index


	    if (!childNodes || childNodes.length == 0) return

	    index = _.indexOf(childNodes, this)

	    if (index == -1) return

	    for (var i = index - 1; i > 0; i--) {
	      child = childNodes[i]
	      if (withDeleted || (!withDeleted && !child.deleted)) {
	        preNode = child
	        break
	      }
	    }
	    return preNode
	  },
	  next: function(withDeleted) {
	    var childNodes = this.parentNode.childNodes
	    var nextNode, child, index
	    if (!childNodes || childNodes.length == 0) return

	    index = _.indexOf(childNodes, this)
	    if (index == -1) return

	    for (var i = index + 1; i < childNodes.length; i++) {
	      child = childNodes[i]
	      if (withDeleted || (!withDeleted && !child.deleted)) {
	        nextNode = child
	        break
	      }
	    }
	    return nextNode
	  },
	  replace: function(dstEl) {

	    //如果没有删除，那就先软删除自己
	    if (!this.deleted) {
	      this.remove(true)
	    }

	    var element = this.getElement()

	    this.parentNode._findAndSplice(this, dstEl)

	    //如果我还不在dom上直接返回
	    if (!element) return

	    //看对方在不在dom上
	    if (dstEl.getElement()) {
	      //对于collection要特殊处理
	      if (dstEl.nodeType == -1) {
	        for (var i = 0,l = dstEl.childNodes.length; i < l; i++) {
	          this.domBefore(dstEl.childNodes[i].getElement(),this.getElement())
	        }
	        this.domRemove(this.getElement())

	      }else{
	        this.domReplace(this.getElement(),dstEl.getElement())
	      }
	    }else{
	      //挨个的拿人家的子节点，替换
	      var mountHtml = dstEl.mountView(this.view)
	      var frag = _.string2frag(mountHtml)
	      this.domBefore(frag,this.getElement())
	      this.domRemove(this.getElement())
	    }

	    return dstEl
	  },
	  before:function(dstEl){

	    var dstChilds = dstEl.parentNode.childNodes
	    var index = _.indexOf(dstChilds,dstEl)
	    dstEl.parentNode.childNodes.splice(index,0,this)
	    this.parentNode = dstEl.parentNode

	    //如果对方不在dom上，就没必要操作
	    if (!dstEl.getElement()) return

	    var dstNode = dstEl.nodeType == -1 ? dstEl.endElement : dstEl.getElement()

	    //如果自己在dom上
	    if (this.getElement()){

	      if (this.nodeType == -1) {
	        for (var i = 0,l = this.childNodes.length; i < l; i++) {
	          this.domBefore(this.childNodes[i].getElement(),dstNode)
	        }
	      }else{
	        this.domBefore(this.element,dstNode)
	      }

	    }else{
	      var mountHtml = this.mountView(dstEl.view)
	      var frag = _.string2frag(mountHtml)
	      this.domBefore(frag,dstEl.getElement())
	    }
	  },
	  after:function(dstEl){

	    var dstChilds = dstEl.parentNode.childNodes
	    var index = _.indexOf(dstChilds,dstEl) + 1

	    dstEl.parentNode.childNodes.splice(index,0,this)
	    this.parentNode = dstEl.parentNode

	    //如果对方不在dom上，就没必要操作
	    if (!dstEl.getElement()) return

	    var dstNode = dstEl.nodeType == -1 ? dstEl.endElement : dstEl.getElement()
	    //如果自己在dom上
	    if (this.getElement()){
	      if (this.nodeType == -1) {
	        for (var i = 0,l = this.childNodes.length; i < l; i++) {
	          this.domAfter(this.childNodes[i].getElement(),dstNode)
	        }
	      }else{
	        this.domAfter(this.element,dstNode)
	      }

	    }else{
	      var mountHtml = this.mountView(dstEl.view)
	      var frag = _.string2frag(mountHtml)
	      this.domAfter(frag,dstNode)
	    }

	  },
	  remove: function(softDeleted) {

	    var lastElement = this.getElement()

	    if (softDeleted) {
	      this.deleted = true
	    } else {
	      this.parentNode._findAndSplice(this)
	    }

	    if (!lastElement) return
	    //软删除的话不是真的删除，而是加一个占位符
	    if (softDeleted) {
	      var deletedNode = _.string2node(this.mountDeleted())
	      this.domReplace(lastElement,deletedNode)
	      this.element = deletedNode
	    }else{
	      this.domRemove(lastElement)
	    }
	  }
	})




	var Element = Node.extend({
	  init: function(options) {
	    this.options = options
	    this.attributes = options.attributes
	    this.tagName = options.tagName
	    this.childNodes = options.childNodes
	    this.hasBlock = options.hasBlock
	    this.nodeType = 1
	  },
	  hasChildNodes: function() {
	    return this.childNodes && this.childNodes.length && this.childNodes.length > 0
	  },
	  first:function(){
	    return this.childNodes[0]
	  },
	  last:function(){
	    return this.childNodes[this.childNodes.length-1]
	  },
	  hasClass:function(classname){
	    var index = _.indexOfKey(this.attributes, 'name', 'class')

	    if (index == -1) return false

	    var classStr = this.attributes[index].value

	    var classes = _.trim(classStr).split(/\s+/)

	    return _.indexOf(classes,classname) == -1 ? false : true

	  },
	  addClass:function(classname){

	    if (!classname) return

	    var classStr = this.getAttribute('class')
	    classStr += ' ' + classname

	    var index = _.indexOfKey(this.attributes, 'name', 'class')
	    var attr = {
	      name: 'class',
	      value: classStr
	    }

	    if (index !== -1) {
	      this.attributes[index] = attr
	    } else {
	      this.attributes.push(attr)
	    }

	    if (!this.getElement()) return

	    _addClass(this.getElement(),classname)

	  },
	  removeClass:function(classname){

	    var index = _.indexOfKey(this.attributes, 'name', 'class')

	    if (index == -1) return

	    var classStr = this.attributes[index].value

	    var classes = _.trim(classStr).split(/\s+/)

	    _.findAndRemove(classes,classname)

	    this.attributes[index].value = classes.join(' ')

	    if (!this.getElement()) return

	    _removeClass(this.getElement(),classname)

	  },
	  hasAttribute:function(key){
	    return this.getAttribute(key) != ''
	  },
	  getAttribute:function(key){
	    var index = _.indexOfKey(this.attributes, 'name', key)
	    if (index !== -1) {
	      return this.attributes[index].value
	    }

	    return ''
	  },
	  setAttribute: function(key, value) {


	    if (value === undefined || value === null) {
	      value = ''
	    }

	    //不允许存在破坏节点的特殊字符
	    //todo 一些防止xss的处理
	    //还有{{{}}}的特殊处理，具有回转的效果
	    // if (_.isString(value)) {
	    //   //value = _.htmlspecialchars(value)
	    //   //value = value.replace(/</g, '&lt;').replace(/>/g, '&gt;')
	    // }

	    var index = _.indexOfKey(this.attributes, 'name', key)
	    var attr = {
	      name: key,
	      value: value
	    }

	    if (index !== -1) {
	      this.attributes[index] = attr
	    } else {
	      this.attributes.push(attr)
	    }

	    //修改真实dom
	    if (!this.getElement()) return

	    var element = this.getElement()

	    //值完全一样就没必要修改
	    if (_getAttribute(element,key) === value) return

	    this.view.$rootView.fire('beforeUpdateAttribute', [element], this)

	    if (_.indexOf(['value', 'checked', 'selected'], key) !== -1 && key in element) {
	      element[key] = key === 'value' ? (value || '') // IE9 will set input.value to "null" for null...
	        : value
	    } else {
	      element.setAttribute(key, value)
	    }

	    this.view.$rootView.fire('afterUpdateAttribute', [element], key, value, this)

	  },
	  removeAttribute: function(key) {
	    var index = _.indexOfKey(this.attributes, 'name', key)
	    if (index !== -1) {
	      this.attributes.splice(index, 1)
	    }
	    //修改真实dom
	    if (!this.getElement()) return

	    var element = this.getElement()
	    this.view.$rootView.fire('beforeRemoveAttribute', [element], key, this)
	    element.removeAttribute(key)
	    this.view.$rootView.fire('afterRemoveAttribute', [element], key, this)

	  },
	  mountHtml: function(view) {
	    var tagName = this.tagName
	    var attrsString = ''
	    var attrStr,value

	    _.each(this.attributes, function(attr) {
	      //如果不是debug跳过指令属性
	      if (attr.name.indexOf(config.prefix+'-') == 0) return
	      //需要判断整数的情况,以及没有值的情况
	      value = attr.value

	      if (_.isString(value)) {
	        value = '"' + value.replace(/"/g, '&quot;') + '"'
	      }

	      //对于checked这种特殊的，如果为false，那么不需要渲染属性
	      if (attr.name == 'checked' && !value) return

	      attrStr = value === undefined ? attr.name : attr.name + '='+ value
	      attrsString += ' ' + attrStr + ' '
	    })

	    attrsString += ' ' + TAG_ID + '="' + this.patId + '"'

	    if (singgleCloseTags[tagName]) {
	      return '<' + tagName + attrsString + ' />'
	    }


	    //对于textarea需要特殊处理，将value作为innerHTML
	    if (tagName.toUpperCase() == 'TEXTAREA') {
	      return '<' + tagName + attrsString + '>' + this.getAttribute('value') + '</' + tagName + '>'
	    }

	    var childHtml = ''
	    _.each(this.childNodes, function(child) {
	      childHtml += child.mountView(view)
	    })

	    return '<' + tagName + attrsString + '>' + childHtml + '</' + tagName + '>'
	  }
	})


	/**
	 * 一个集合，主要用于处理包裹的问题，根节点还有 if for的block都是这种节点
	 * 这个节点本身没有什么属性之类的，有的是多个子节点，操作时也是多个子节点
	 * 由virtual dom来解决这个差异问题
	 */
	var Collection = Element.extend({
	  init: function(options) {
	    this.options = options
	    this.nodeType = -1
	    this.tagName = options.tagName
	    this.attributes = options.attributes
	    this.childNodes = options.childNodes
	    this.hasBlock = options.hasBlock
	  },
	  mountHtml:function(view){
	    var childHtml = ''
	    _.each(this.childNodes, function(child) {
	      childHtml += child.mountView(view)
	    })

	    return childHtml
	  },

	  getElement: function() {
	    if (!this.patId || !this.view) return

	    if (this.element) return this.element
	    //集合的软删除，需要通过自己的id去找
	    if (this.deleted) {
	      this.element = _.queryRealDom(this)
	      return this.element
	    }

	    //否则返回第一个子节点
	    var startElement = this.first().getElement()
	    var endElement = this.last().getElement()

	    if (startElement) {
	      this.element = startElement
	    }

	    if (endElement) {
	      this.endElement = endElement
	    }
	    return startElement
	  },
	  remove: function(softDeleted) {
	    var lastElement = this.getElement()
	    if (softDeleted) {
	      this.deleted = true
	    } else {
	      this.parentNode._findAndSplice(this)
	    }

	    if (!lastElement) return
	    //软删除的话不是真的删除，而是加一个占位符
	    var childNodes = this.childNodes
	    if (softDeleted) {
	      var deletedNode = _.string2node(this.mountDeleted())
	      this.domReplace(lastElement,deletedNode)
	      this.element = deletedNode
	    }
	    //挨个删除子节点，这个是硬删除，没必要留着了。有个位置留着就行
	    while(this.childNodes.length){
	      this.childNodes[0].remove()
	    }
	  },
	  hasChildNodes: function() {
	    return this.childNodes && this.childNodes.length && this.childNodes.length > 0
	  }
	})


	var TextNode = Node.extend({
	  init: function(options) {
	    this.options = options
	    this.data = options.data
	    this.nodeType = 3
	    this.oneTime = true
	  },
	  html: function(text) {

	    if (text === undefined || text === null) {
	      text = ''
	    }

	    if (_.isString(text)) {
	      text = _.htmlspecialchars(text)
	    }

	    this.data = text
	    //修改真实dom
	    if (!this.getElement()) return
	    this.getElement().innerHTML = text
	  },
	  mountHtml: function(view) {
	    //如果一些文本不需要改变，那就直接渲染成文本，不需要二次修改,就不需要包裹标签
	    //这里注意有个例外，如果这个文本节点是collection节点的第一个或者最后一个子元素
	    //因为collection需要定位，所以需要包裹
	    var parentNode = this.parentNode
	    var isFirstNode = (parentNode.nodeType == -1 && parentNode.first() === this)
	    var isLastNode = (parentNode.nodeType == -1 && parentNode.last() === this)

	    if (this.oneTime && !isFirstNode && !isLastNode){
	     return this.data
	    }

	    return '<span ' + TAG_ID + '="' + this.patId + '">' + this.data + '</span>'
	  }
	})


	function isBlockAttribute(name){
	  var Directive = __webpack_require__(8)
	  return Directive.isBlockDirective(name)
	}


	function getBlockAttributes(attributes){

	  var newAttrs = []
	  var attr
	  for (var i = 0; i < attributes.length; i++) {
	    attr = attributes[i]
	    if (isBlockAttribute(attr.name)) {
	      newAttrs.push(attr)
	      break
	    }
	  }

	  return newAttrs

	}



	module.exports = {
	  createRoot: function(childNodes,notRoot) {
	    var root = new Collection({
	      tagName: 'template',
	      attributes: [],
	      childNodes: childNodes,
	      hasBlock:false
	    })

	    if (!notRoot) {
	      root.__ROOT__ = true
	    }


	    childNodes && _.each(childNodes, function(child) {
	      child.parentNode = root
	    })

	    return root
	  },
	  createElement: function(tag, attrs, childNodes) {
	    var attributes = []
	    var hasBlock = false

	    childNodes = childNodes || []

	    _.each(attrs, function(value, key) {
	      attributes.push({
	        name: key,
	        value: value
	      })

	      if (isBlockAttribute(key)) {
	        hasBlock = true
	      }
	    })

	    var element = null
	    if (tag == 'template') {

	      //针对template的节点，只保留block类型的指令，并且只保留一个
	      attributes = getBlockAttributes(attributes)
	      //如果发现不到两个子节点，并且子节点没有block的指令
	      //那么这个collection是没有意义的，直接，返回子节点
	      if (childNodes && childNodes.length == 1 && childNodes[0].nodeType == 1 && !childNodes[0].hasBlock) {
	        //属性放到子节点上
	        childNodes[0].options.attributes = childNodes[0].attributes = childNodes[0].attributes.concat(attributes)
	        childNodes[0].options.hasBlock = childNodes[0].hasBlock = true

	        return childNodes[0]
	      }else if(!childNodes || childNodes.length == 0){
	        return
	      }else{
	        element = new Collection({
	          tagName: tag,
	          attributes: attributes,
	          childNodes: childNodes,
	          hasBlock:hasBlock
	        })
	      }

	    }else{
	      element = new Element({
	        tagName: tag,
	        attributes: attributes,
	        childNodes: childNodes,
	        hasBlock:hasBlock
	      })
	    }

	    childNodes && _.each(childNodes, function(child) {
	      child.parentNode = element
	    })

	    element.hasBlock = hasBlock

	    return element
	  },
	  createTextNode: function(data) {
	    if (!data){
	      data = ''
	    }

	    return new TextNode({
	      data: data
	    })
	  }

	}

/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * 用来分析模板字符串，解析成virtual dom
	 */

	var _ = __webpack_require__(3)
	var parser = __webpack_require__(9)
	var Element = __webpack_require__(25)
	var Config = __webpack_require__(1)


	var delimiters = Config.delimiters
	var unsafeDelimiters = Config.unsafeDelimiters
	var blockStartReg = new RegExp(delimiters[0] + '\\#([^(]*)\\((.*?)\\)' + delimiters[1],'g')
	var blockStartRegFalse = new RegExp(delimiters[0] + '\\^([^(]*)\\((.*?)\\)' + delimiters[1],'g')
	var blockEndReg = new RegExp(delimiters[0] + '\\/(.*?)' + delimiters[1],'g')

	var createElement = Element.createElement
	var createTextNode = Element.createTextNode
	var createRoot = Element.createRoot

	TAG_RE = parser.TAG_RE
	TEXT_NODE = 'text'

	//http://haacked.com/archive/2004/10/25/usingregularexpressionstomatchhtml.aspx/
	ATTRIBUTE_REG = /(?:[\w-:]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^'">\s]*))?/g
	HTML_TAG_REG = /<\/?(\w+)((?:\s+(?:[\w-:]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^'">\s]*))?)+\s*|\s*)\/?\>/g

	HTML_COMMENT_REG = /<!--(.|\s)*?-->/g

	/**
	 * 收集模板中的各种Tag
	 *
	 * @param {String} template
	 */
	function collectTags(structure,template) {
	  //var inner
	  var last_offset = 0

	  template.replace(HTML_TAG_REG, function(match,tagName,attrString,offset) {

	    if (offset > last_offset) {
	      analyzeText(structure,template.slice(last_offset, offset))
	    }

	    //inner = match.match(/<\/?(\w+)([^>]*?)\/?>$/)

	    if (!tagName && ("development") != 'production') {
	      _.error('Bad tag' + match + '.')
	    }

	    structure.push({
	      tagName: tagName.toLowerCase()
	    })
	    structure.end++

	    if (/<\/\w+/.test(match)) {
	      structure[structure.end].isEnd = true
	    } else if (attrString !== '') {
	      structure[structure.end].attrs = analyzeAttributes(attrString)
	    }

	    last_offset = offset + match.length

	    return match
	  })

	  if (last_offset != template.length) {
	    analyzeText(structure,template.slice(last_offset))
	  }
	}

	//对于前后的回车空格全部删除
	//text如果里面有{{}}需要作为单独的节点
	function analyzeText(structure,tempText){

	  tempText = tempText.replace(/^[\n\s\t]+/g,'').replace(/[\n\s\t]+$/g,'')

	  if (!tempText) return

	  //找出里面有没有特殊的占位节点
	  var tokens = spText(tempText)

	  _.each(tokens,function(text){
	    structure.push({
	      tagName:TEXT_NODE,
	      text:text
	    })
	    structure.end++
	  })

	}

	function spText(text){
	  //匹配不到插值说明是普通的，直接返回
	  if (!TAG_RE.test(text)) {
	    return [text]
	  }

	  var result = []
	  var lastIndex = TAG_RE.lastIndex = 0
	  var match, index
	  while (match = TAG_RE.exec(text)) {
	    index = match.index
	      // push text token
	    if (index > lastIndex) {
	      result.push(text.slice(lastIndex, index))
	    }
	    result.push(match[0])
	    lastIndex = index + match[0].length
	  }

	  if (lastIndex < text.length) {
	    result.push(text.slice(lastIndex))
	  }

	  return result

	}

	function analyzeAttributes(attrString){
	  var attributes = {}
	  var attrs,name,value,index
	  //严谨起见，避免出现多个空格的情况
	  //attrString = attrString.replace(/\ (?=\ )/g, '')

	  attrs = attrString.match(ATTRIBUTE_REG)//注意，属性里可能有引号
	  _.each(attrs,function(attr){
	    index = attr.indexOf('=')
	    if (~index) {
	      name = attr.slice(0,index)
	      value = _.trim(attr.slice(index+1).replace(/^('|")/,'').replace(/('|")$/,''))
	    }else{
	      name = attr
	      value = undefined
	    }
	    attributes[_.trim(name)] = value
	  })

	  return attributes

	}


	/**
	 * 从后到前分析html tag
	 *
	 * @param {Array} tags
	 * @param {Number} pointer
	 * @param {Object} [pair]
	 *
	 * 思路：
	 * 倒序分析tags————循环A，如果到头了就退出
	 *    如果不是end
	 *       如果有待配对tag且tagName相同
	 *          与待配对的tag配上了，放到close_tag标记里
	 *          退出循环A
	 *       否则
	 *          这是一个非闭合性的tag或TEXT_NODE，放到记录数组里
	 *          进入下一轮循环A
	 *    否则
	 *       从前一个tag开始，寻找它的待配对tag
	 *       如果子任务的返回没有close_tag
	 *          tag没有闭合，抛出错误
	 *          中止
	 *       整理返回结果
	 *       同步pointer
	 *       进入下一轮循环A
	 *
	 * 返回记录数组
	 */
	function getStructure(tags, pointer, pair) {
	  var re = {
	      found: []
	    },
	    tmp,element

	  for (var i = pointer; i >= 0; i--) {
	    if (!tags[i].isEnd) {
	      if (
	        pair != undefined &&
	        tags[i].tagName == pair.tagName
	      ) {
	        re.close_tag = tags[i]
	        re.latest_pointer = i
	        break;
	      } else if (tags[i].tagName === TEXT_NODE) {
	        re.found.unshift(createTextNode(tags[i].text))
	      } else {
	        element = createElement(tags[i].tagName,tags[i].attrs)
	        element && re.found.unshift(element)
	      }
	    } else {
	      tmp = getStructure(tags, i - 1, tags[i])
	      if (!tmp && ("development") != 'production') {
	        _.error(tags[i - 1].tagName + ' does not have correspond start tag.')
	        return
	      }
	      if (!tmp.close_tag && ("development") != 'production') {
	        _.error(tags[i].tagName + ' does not have correspond start tag.')
	        return
	      }
	      tmp.close_tag.paired = true
	      i = tmp.latest_pointer
	      if (tmp.found.length != 0) {
	        tmp.close_tag.children = tmp.found
	      }

	      //对于textarea需要特殊处理
	      //它会将首次的innerHTML作为值，后面需要通过修改value来更改
	      if (tmp.close_tag.tagName.toUpperCase() == 'TEXTAREA') {
	        var textareaInner = '',isunSafe

	        _.each(tmp.close_tag.children,function(child){
	          if (!child.data && ("development") != 'production') {
	            _.error('please do not use element in textarea')
	            return
	          }

	          // if (_.isString(child.data)) {
	          //   //isunSafe = child.data.indexOf(unsafeDelimiters[0]) > -1
	          //   //所有的设置为一次性
	          //   //child.data = isunSafe ? child.data.replace(unsafeDelimiters[0],unsafeDelimiters[0]+'*') : child.data.replace(delimiters[0],delimiters[0]+'*')
	          // }

	          textareaInner += child.data
	        })

	        //textareaInner.replace(new RegExp(delimiters[0]+"\*?",'g'),delimiters[0]+'*')
	        tmp.close_tag.attrs['value'] = textareaInner
	        //不需要子节点
	        tmp.close_tag.children = []
	      }


	      element = createElement(tmp.close_tag.tagName,tmp.close_tag.attrs,tmp.close_tag.children)
	      element && re.found.unshift(element)
	    }
	  }

	  /**
	   * 普通情况下，for循环后i会比实际情况小1，这是因为for循环会先改变i再对i>=0做判断。
	   * 但是，如果是break的情况，i就是实际情况，所以这里要对i做区分处理。
	   */
	  if (re.latest_pointer === undefined) {
	    re.latest_pointer = i + 1;
	  }

	  return re
	}


	/**
	 * 用于对template做一次正则替换，以支持mustache的一些写法
	 */
	function _normalize(template){

	  var newTpl = template + ''

	  //去掉所有的注释
	  newTpl = newTpl.replace(HTML_COMMENT_REG,'')
	  //支持mustache的一些写法
	  newTpl = newTpl.replace(blockStartReg,'<template t-$1="$2">')
	  newTpl = newTpl.replace(blockStartRegFalse,'<template t-$1="!($2)">')
	  newTpl = newTpl.replace(blockEndReg,'</template>')

	  return newTpl

	}


	/**
	 * 转化字符串为virtualdom
	 * @param  {string} template 需要转化的模板
	 * @return {virtualdom}      转化之后的virtualdom
	 */
	exports.transfer = function(template) {

	  if (_.isObject(template) && template.__VD__) {
	    return template
	  }

	  if (template == '') {
	    return createRoot([createTextNode('')],false)
	  }

	  template = _normalize(template)

	  var structure = []
	  var result,rootElement

	  structure.end = -1
	  collectTags(structure,template)
	  result = getStructure(structure,structure.length - 1)
	  rootElement = createRoot(result.found)

	  return rootElement
	}







/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(3)

	module.exports = {
	  //添加监听
	  on: function(key, listener) {
	    //this.__events存储所有的处理函数
	    if (!this.__events) {
	      this.__events = {}
	    }
	    if (!this.__events[key]) {
	      this.__events[key] = []
	    }
	    if (_.indexOf(this.__events, listener) === -1 && typeof listener === 'function') {
	      this.__events[key].push(listener)
	    }

	    return this
	  },
	  //触发一个事件，也就是通知
	  fire: function(key) {

	    if (!this.__events || !this.__events[key]) return

	    var args = Array.prototype.slice.call(arguments, 1) || []

	    var listeners = this.__events[key]
	    var i = 0
	    var l = listeners.length

	    for (i; i < l; i++) {
	      listeners[i].apply(this, args)
	    }

	    return this
	  },
	  //取消监听
	  off: function(key, listener) {

	    if (!key && !listener) {
	      this.__events = {}
	    }
	    //不传监听函数，就去掉当前key下面的所有的监听函数
	    if (key && !listener) {
	      delete this.__events[key]
	    }

	    if (key && listener) {
	      var listeners = this.__events[key]
	      var index = _.indexOf(listeners, listener)

	      (index > -1) && listeners.splice(index, 1)
	    }
	    return this;
	  }

	}

/***/ }
/******/ ])
});
;