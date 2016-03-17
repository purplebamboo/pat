
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
