
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

exports.indexOfKey = function(arrayObject,key,value){
  if (arrayObject === null) return -1
  var i = 0, length = arrayObject.length
  for (; i < length; i++) if (arrayObject[i][key] === value) return i
  return -1
}


/*
  深拷贝
 */
var _skipKeyFn = function(){
  return false
}

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
