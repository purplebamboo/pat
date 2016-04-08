

var config = require('../config')
var _ = require('./lang.js')
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

    //如果父级是root或者是template直接从容器开始找
    var parent

    if (!virtualDom.parentNode || virtualDom.parentNode.__ROOT__ || virtualDom.parentNode.nodeType === -1) {
      parent = root
    }else{
      parent = _query(root,virtualDom.parentNode.patId)
    }

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



