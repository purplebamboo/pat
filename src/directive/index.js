

var _ = require('../util/index.js')
var Class = _.Class
var parser = require('../parser')
var config = require('../config.js')

DIR_REGX = parser.DIR_REGX
INTERPOLATION_REGX = parser.INTERPOLATION_REGX

//基础指令定义
var directives = {
  'bind':require('./bind.js'),
  'class':require('./class.js'),
  'model':require('./model.js'),
  'if':require('./if.js'),
  'unless':require('./unless.js'),
  'for':require('./for.js'),
  'text':require('./text.js'),
  'html':require('./html.js')
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