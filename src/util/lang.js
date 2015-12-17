
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



//辅组函数，获取数组里某个元素的索引 index
exports.indexOf = function(array,key){
  if (array === null) return -1
  var i = 0, length = array.length
  for (; i < length; i++) if (array[i] === item) return i
  return -1
}