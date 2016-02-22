var Watcher = require('../watcher/index.js')
var _ = require('../util')
var Observer = require('../watcher/observer.js')

require('./array.js')

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

    // if (_.isObject(newVal)) {
    //   newVal = exports.inject(newVal)

    //   newVal.__parentVal__ = newVal.__parentVal__ || []
    //   //_.findAndReplaceOrAdd()
    //   if (_.indexOf(newVal.__parentVal__,ob.owner) == -1) {
    //     newVal.__parentVal__.push(ob.owner)
    //   }

    // }


    //todo 有时两个值一样，但是还是需要去修改__parentVal__
    if (newVal === ob.val) {
      return
    }

    //有些已经失效的watcher先去掉
    ob.unique()

    //如果是对象需要特殊处理
    if (_.isObject(newVal)) {
      ob.val = exports.inject(newVal)

      //ob.val.__parentVal__ = ob.val.__parentVal__ || []
      //ob.val.__parentVal__.push(ob.owner)
      //_.findAndReplace(ob.val.__parentVal__,oriData,self.$data)
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
  var VB_ID = 0

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
      if (obj.hasOwnProperty && !obj.hasOwnProperty(key)) continue
      obs[key] = new Observer()
      obs[key].val = obj[key]
      obs[key].key = key
      //可能存在多个parentVal
      //obs[key].parentVal = obs[key].parentVal || []
      //obs[key].parentVal.push(newObj)

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
    //buffer.push("\tPublic [" + '__parentVal__' + "]")

    buffer.unshift(
      '\r\n\tPrivate [_acc], [_pro]',
      '\tPublic Default Function [self](proxy)',
      '\t\tSet [_pro] = proxy',
      '\t\tSet [self] = me',
      '\tEnd Function'
    );

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
      //obs[key].owner = newObj
      //可能存在多个parentVal
      // if (_.isObject(obs[key].val) && obs[key].val.__inject__) {
      //   debugger
      //   obs[key].val.__parentVal__ = obs[key].val.__parentVal__ || []
      //   obs[key].val.__parentVal__.push(newObj)
      // }
      // obs[key].__parentVal__ = obs[key].__parentVal__ || []
      // obs[key].__parentVal__.push(newObj)

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
  return _.indexOf(['__ori__','__inject__'],key) != -1
}

function _oriData(injectData){
  var result = null,ori

  result = injectData

  if (_.isArray(injectData)) {
    result = []
    _.each(injectData,function(item,key){
      result.push(_oriData(item))
    })
  }else if(_.isPlainObject(injectData)){
    ori = injectData.__ori__
    result = {}
    _.each(ori,function(v,key){
      result[key] = _oriData(injectData[key])
    })
  }
  //var
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
    //debugger
    //data = _oriData(data)
  }

  if (_.isArray(data)) {

    newData = []
    newData.__inject__ = true
    var tmpl
    _.each(data,function(value){
      // tmpl = value
      // if(_.isObject(value)){
      //   tmpl = exports.inject(value,deep)
      //   tmpl.__parentVal__ = tmpl.__parentVal__ || []
      //   //_.findAndReplaceOrAdd(tmpl.__parentVal__,)
      //   if (_.indexOf(tmpl.__parentVal__,newData) == -1) {
      //     tmpl.__parentVal__.push(newData)
      //   }
      //   //tmpl.__parentVal__.push(newData)
      // }
      tmpl = exports.inject(value,deep)
      newData.push(tmpl)
    })
    return newData
  }

  if (_.isPlainObject(data)) {
    //newData = {}
    newData = exports.define(data)
    //检测对象的值，需要再递归的去inject
    _.each(data,function(value,key){
      if (_.isObject(value)) {
        //赋值，同时会触发set，这样就把observer的值注入好了
        newData[key] = exports.inject(value,deep)
      }
    })
    //newData = exports.define(newData)

    return newData
  }

  return data
}