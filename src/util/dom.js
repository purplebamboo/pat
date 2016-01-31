

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


exports.string2node = function(string){
  return exports.string2nodes(string)[0]
}

exports.string2nodes = function(string){
  var wrap = document.createElement('div')
  //ie8下面不支持注释节点，所以需要做出特殊处理
  //todo...
  wrap.innerHTML = _.trim(string)
  return wrap.childNodes
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



